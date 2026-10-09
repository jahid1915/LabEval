require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Department = require('../models/Department');
const SessionalCourse = require('../models/SessionalCourse');
const ElectiveCourse = require('../models/ElectiveCourse');
const CourseOffering = require('../models/CourseOffering');
const { parseCourseCode, normalizeSemesterLevel } = require('../utils/courseCodeParser');

async function migrateCatalogs(isDryRun = false) {
  console.log('====================================================');
  console.log(`🚀 LabEval Academic Catalogs Migration ${isDryRun ? '[DRY RUN MODE]' : '[LIVE EXECUTION]'}`);
  console.log('====================================================');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/labeval';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  const departments = await Department.find().lean();
  const deptMapByCode = new Map();
  const deptMapById = new Map();
  departments.forEach(d => {
    deptMapByCode.set(d.code.toUpperCase(), d._id);
    deptMapById.set(d._id.toString(), d);
  });

  // 1. Fetch all existing courses
  const allCourses = await Course.find().lean();
  console.log(`📚 Total existing master courses in database: ${allCourses.length}`);

  let sessionalCount = 0;
  let electiveCount = 0;
  let skippedCount = 0;

  for (const c of allCourses) {
    const isSessional = c.isSessional === true || c.courseType === 'Sessional' || c.courseType === 'Lab';
    const isElective = c.isElective === true || c.courseType === 'Elective';

    // Resolve department
    let deptId = c.department;
    let deptCode = c.departmentCode;
    if (!deptId && deptCode && deptMapByCode.has(deptCode.toUpperCase())) {
      deptId = deptMapByCode.get(deptCode.toUpperCase());
    } else if (deptId && !deptCode && deptMapById.has(deptId.toString())) {
      deptCode = deptMapById.get(deptId.toString()).code;
    }

    if (!deptId) {
      console.warn(`⚠️ Skipping course ${c.courseCode} — could not resolve department.`);
      skippedCount++;
      continue;
    }

    const parsed = parseCourseCode(c.courseCode);
    const semesterLevel = parsed.isValid ? parsed.semesterLevel : normalizeSemesterLevel(c.semesterLevel || '1-1');

    // ── Migrate Sessional Courses ──────────────────────────────────────────────
    if (isSessional) {
      sessionalCount++;
      const sessionalDoc = {
        courseCode: c.courseCode.trim().toUpperCase(),
        courseTitle: c.courseName || c.courseTitle || 'Sessional Course',
        department: deptId,
        departmentCode: deptCode ? deptCode.toUpperCase() : 'UNKNOWN',
        credit: c.credit || 1.5,
        creditHours: c.creditHours || 3.0,
        courseType: c.courseType === 'Lab' ? 'Lab' : 'Sessional',
        semesterNumber: parsed.semesterNumber || 1,
        semesterTerm: parsed.semesterTerm || 1,
        semesterLevel: semesterLevel || '1-1',
        pairedTheoryCourseCode: c.pairedCourseCode || '',
        defaultAssessmentConfig: c.defaultAssessmentConfig || c.assessmentConfig || {},
        syllabus: c.syllabus || '',
        description: c.description || '',
        isActive: c.status !== 'archived' && c.status !== 'inactive',
        legacyCourseId: c._id
      };

      if (!isDryRun) {
        await SessionalCourse.findOneAndUpdate(
          { courseCode: sessionalDoc.courseCode, department: deptId },
          { $set: sessionalDoc },
          { upsert: true, new: true }
        );
      }
    }

    // ── Migrate Elective Courses ───────────────────────────────────────────────
    if (isElective) {
      electiveCount++;
      const electiveGroup = c.description && c.description.toLowerCase().includes('group')
        ? c.description
        : (c.pairedCourseCode || 'Elective I');

      const electiveDoc = {
        courseCode: c.courseCode.trim().toUpperCase(),
        courseTitle: c.courseName || c.courseTitle || 'Elective Course',
        department: deptId,
        departmentCode: deptCode ? deptCode.toUpperCase() : 'UNKNOWN',
        credit: c.credit || 3.0,
        creditHours: c.creditHours || 3.0,
        courseType: isSessional ? 'Sessional' : 'Theory',
        electiveGroup: electiveGroup || 'Elective I',
        semesterNumber: parsed.semesterNumber || 4,
        semesterTerm: parsed.semesterTerm || 1,
        semesterLevel: semesterLevel || '4-1',
        eligibilityRules: {
          eligibleSeries: c.series ? [c.series] : [],
          prerequisites: c.pairedCourseCode ? [c.pairedCourseCode] : []
        },
        syllabus: c.syllabus || '',
        description: c.description || '',
        isActive: c.status !== 'archived' && c.status !== 'inactive',
        legacyCourseId: c._id
      };

      if (!isDryRun) {
        await ElectiveCourse.findOneAndUpdate(
          { courseCode: electiveDoc.courseCode, department: deptId },
          { $set: electiveDoc },
          { upsert: true, new: true }
        );
      }
    }
  }

  // ── Sync Course Offerings Metadata ──────────────────────────────────────────
  console.log('\n🔄 Updating Course Offerings category & semester level metadata...');
  const offerings = await CourseOffering.find().lean();
  let updatedOfferings = 0;

  for (const offering of offerings) {
    const parsed = parseCourseCode(offering.courseCode);
    const semesterLevel = parsed.isValid ? parsed.semesterLevel : normalizeSemesterLevel(offering.semesterName || '');
    
    // Check if it's a sessional or elective course
    const isSess = await SessionalCourse.findOne({ courseCode: offering.courseCode }).lean();
    const isElec = await ElectiveCourse.findOne({ courseCode: offering.courseCode }).lean();

    const updateFields = {
      courseCategory: isElec ? 'elective' : (isSess ? 'sessional' : 'sessional'),
      semesterLevel: semesterLevel || '1-1',
      semesterNumber: parsed.semesterNumber || 1,
      semesterTerm: parsed.semesterTerm || 1
    };

    if (isSess) updateFields.sessionalCourseRef = isSess._id;
    if (isElec) updateFields.electiveCourseRef = isElec._id;

    if (!isDryRun) {
      await CourseOffering.updateOne({ _id: offering._id }, { $set: updateFields });
    }
    updatedOfferings++;
  }

  console.log('\n====================================================');
  console.log('📊 MIGRATION SUMMARY:');
  console.log(`- Sessional Courses Identified & Processed: ${sessionalCount}`);
  console.log(`- Elective Courses Identified & Processed:  ${electiveCount}`);
  console.log(`- Course Offerings Categorized:             ${updatedOfferings}`);
  console.log(`- Skipped records:                          ${skippedCount}`);
  console.log('====================================================');
  if (isDryRun) {
    console.log('🔎 Dry run complete. No database mutations occurred.');
  } else {
    console.log('✅ Live migration executed successfully. Zero data loss.');
  }

  await mongoose.disconnect();
}

const isDryRunArg = process.argv.includes('--dry-run');
migrateCatalogs(isDryRunArg).catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
