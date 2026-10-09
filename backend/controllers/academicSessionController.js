const mongoose = require('mongoose');
const AcademicSession = require('../models/AcademicSession');
const Semester = require('../models/Semester');
const Series = require('../models/Series');
const Department = require('../models/Department');
const Student = require('../models/Student');
const CourseOffering = require('../models/CourseOffering');
const CohortSemesterHistory = require('../models/CohortSemesterHistory');
const SessionalCourse = require('../models/SessionalCourse');
const { logAudit } = require('../middleware/auditMiddleware');
const { getIO } = require('../utils/socketManager');
const { normalizeSemesterLevel } = require('../utils/courseCodeParser');

// In-memory caches (60s TTL)
let sessionsCache = null;
let sessionsCacheExpiresAt = 0;
let seriesCache = new Map();
const CACHE_TTL = 60 * 1000;

const invalidateSessionsCache = () => {
  sessionsCache = null;
  sessionsCacheExpiresAt = 0;
};

const invalidateSeriesCache = () => {
  seriesCache.clear();
};

// ── Academic Sessions ──────────────────────────────────────────────────
const getAcademicSessions = async (req, res) => {
  try {
    if (sessionsCache && Date.now() < sessionsCacheExpiresAt) {
      return res.json(sessionsCache);
    }

    const sessions = await AcademicSession.find().sort({ year: -1 });
    sessionsCache = sessions;
    sessionsCacheExpiresAt = Date.now() + CACHE_TTL;
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAcademicSession = async (req, res) => {
  try {
    const { name, year, isCurrent, startDate, endDate } = req.body;
    if (!name || !year) return res.status(400).json({ message: 'Session name and year are required' });

    if (isCurrent) {
      await AcademicSession.updateMany({}, { isCurrent: false });
    }

    const session = await AcademicSession.create({
      name: name.trim(),
      year: Number(year),
      isCurrent: !!isCurrent,
      startDate: startDate || null,
      endDate: endDate || null
    });

    // Auto-create standard semesters for new session
    await Semester.create([
      { name: '1st Semester', code: '1st', academicSession: session._id, isCurrent: true, status: 'active' },
      { name: '2nd Semester', code: '2nd', academicSession: session._id, isCurrent: false, status: 'upcoming' }
    ]);

    await logAudit({
      req,
      action: 'CREATE_ACADEMIC_SESSION',
      entity: 'AcademicSession',
      entityId: session._id,
      details: `Created session ${session.name}`,
      newValues: session
    });

    invalidateSessionsCache();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAcademicSession = async (req, res) => {
  try {
    const session = await AcademicSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const { name, year, isCurrent, status, startDate, endDate } = req.body;

    if (isCurrent && !session.isCurrent) {
      await AcademicSession.updateMany({ _id: { $ne: session._id } }, { isCurrent: false });
      session.isCurrent = true;
    } else if (isCurrent !== undefined) {
      session.isCurrent = isCurrent;
    }

    if (name) session.name = name.trim();
    if (year) session.year = Number(year);
    if (status) session.status = status;
    if (startDate !== undefined) session.startDate = startDate;
    if (endDate !== undefined) session.endDate = endDate;

    await session.save();
    invalidateSessionsCache();
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Semesters ──────────────────────────────────────────────────────────
const getSemesters = async (req, res) => {
  try {
    const { sessionId } = req.query;
    let query = {};
    if (sessionId) query.academicSession = sessionId;
    const semesters = await Semester.find(query).populate('academicSession', 'name year isCurrent').sort({ code: 1 });
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSemester = async (req, res) => {
  try {
    const { name, code, academicSession, isCurrent, startDate, endDate } = req.body;
    if (!name || !code || !academicSession) {
      return res.status(400).json({ message: 'Name, code, and academicSession are required' });
    }

    if (isCurrent) {
      await Semester.updateMany({ academicSession }, { isCurrent: false });
    }

    const semester = await Semester.create({
      name: name.trim(),
      code: code.trim(),
      academicSession,
      isCurrent: !!isCurrent,
      startDate,
      endDate
    });

    res.status(201).json(semester);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Series Cohorts ─────────────────────────────────────────────────────
const getSeries = async (req, res) => {
  try {
    const { departmentId, search } = req.query;
    const cacheKey = `${departmentId || 'all'}_${search || 'all'}`;
    const cached = seriesCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    let query = { status: { $ne: 'archived' } };
    if (departmentId) query.department = departmentId;
    if (search) query.name = { $regex: search, $options: 'i' };

    const seriesList = await Series.find(query)
      .populate('department', 'name code')
      .populate('academicSession', 'name year')
      .sort({ name: -1 });

    const enriched = await Promise.all(seriesList.map(async (s) => {
      const studentCount = await Student.countDocuments({
        $or: [
          { seriesRef: s._id },
          { series: s.name, department: s.departmentCode }
        ]
      });
      const offeringCount = await CourseOffering.countDocuments({
        $or: [
          { series: s._id },
          { seriesName: s.name, departmentCode: s.departmentCode }
        ]
      });

      return {
        ...s.toObject(),
        stats: { studentCount, offeringCount }
      };
    }));

    seriesCache.set(cacheKey, {
      data: enriched,
      expiresAt: Date.now() + CACHE_TTL
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSeries = async (req, res) => {
  try {
    const { name, department, academicSession, currentSemester } = req.body;
    if (!name || !department) return res.status(400).json({ message: 'Series name and department are required' });

    const deptDoc = await Department.findById(department);
    if (!deptDoc) return res.status(400).json({ message: 'Department not found' });

    const existing = await Series.findOne({ name: name.trim(), department: deptDoc._id });
    if (existing) return res.status(400).json({ message: 'Series already exists for this department' });

    const series = await Series.create({
      name: name.trim(),
      department: deptDoc._id,
      departmentCode: deptDoc.code,
      academicSession: academicSession || null,
      currentSemester: currentSemester || '1st Semester'
    });

    await logAudit({
      req,
      action: 'CREATE_SERIES',
      entity: 'Series',
      entityId: series._id,
      details: `Created Series ${series.name} in ${deptDoc.code}`,
      newValues: series
    });

    invalidateSeriesCache();
    res.status(201).json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSeries = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Series not found' });

    const { name, academicSession, currentSemester, status } = req.body;
    if (name) series.name = name.trim();
    if (academicSession) series.academicSession = academicSession;
    if (currentSemester) series.currentSemester = currentSemester;
    if (status) series.status = status;

    await series.save();
    invalidateSeriesCache();
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSeries = async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Series not found' });

    const studentCount = await Student.countDocuments({
      $or: [{ seriesRef: series._id }, { series: series.name, department: series.departmentCode }]
    });

    if (studentCount > 0) {
      series.status = 'archived';
      await series.save();
      invalidateSeriesCache();
      return res.json({ message: `Series archived (${studentCount} students preserved)` });
    }

    await series.deleteOne();
    invalidateSeriesCache();
    res.json({ message: 'Series deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Cohort Semester Progression Management (Section 1) ───────────────
const getCohortPreview = async (req, res) => {
  try {
    const { department, series, section } = req.query;
    if (!department || !series) {
      return res.status(400).json({ success: false, message: 'Department and series are required' });
    }

    const cleanDept = String(department).trim().toUpperCase();
    const cleanSeries = String(series).trim();
    const cleanSection = section && section !== 'ALL' ? String(section).trim().toUpperCase() : null;

    // Resolve Department
    const deptDoc = await Department.findOne({
      $or: [
        { code: cleanDept },
        ...(mongoose.Types.ObjectId.isValid(department) ? [{ _id: department }] : [])
      ]
    });
    if (!deptDoc) {
      return res.status(404).json({ success: false, message: `Department '${cleanDept}' not found` });
    }

    // Resolve Series
    const seriesDoc = await Series.findOne({
      department: deptDoc._id,
      name: cleanSeries
    }).populate('academicSession', 'name year');

    // Build Student Query
    const studentQuery = {
      $and: [
        { $or: [{ departmentRef: deptDoc._id }, { department: deptDoc.code }] },
        { $or: [{ series: cleanSeries }, ...(seriesDoc ? [{ seriesRef: seriesDoc._id }] : [])] }
      ],
      status: { $ne: 'suspended' }
    };
    if (cleanSection) {
      studentQuery.section = cleanSection;
    }

    const studentCount = await Student.countDocuments(studentQuery);
    const sampleStudents = await Student.find(studentQuery)
      .select('rollNumber name semester section regularStatus')
      .limit(10)
      .lean();

    res.json({
      success: true,
      department: deptDoc.code,
      departmentName: deptDoc.name,
      series: cleanSeries,
      section: cleanSection || 'ALL',
      currentSemester: seriesDoc?.currentSemester || sampleStudents[0]?.semester || '1st Semester',
      academicSession: seriesDoc?.academicSession?.name || '',
      studentCount,
      sampleStudents
    });
  } catch (err) {
    console.error('getCohortPreview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCohortSemester = async (req, res) => {
  try {
    const { department, series, section, currentSemester, academicSession } = req.body;
    if (!department || !series || !currentSemester) {
      return res.status(400).json({
        success: false,
        message: 'Department, series, and currentSemester are required'
      });
    }

    const cleanDept = String(department).trim().toUpperCase();
    const cleanSeries = String(series).trim();
    const cleanSemester = String(currentSemester).trim();
    const cleanSection = section && section !== 'ALL' ? String(section).trim().toUpperCase() : null;

    // Resolve Department
    const deptDoc = await Department.findOne({
      $or: [
        { code: cleanDept },
        ...(mongoose.Types.ObjectId.isValid(department) ? [{ _id: department }] : [])
      ]
    });
    if (!deptDoc) {
      return res.status(404).json({ success: false, message: `Department '${cleanDept}' not found` });
    }

    // Resolve Session if provided
    let sessionDoc = null;
    if (academicSession) {
      sessionDoc = await AcademicSession.findOne({
        $or: [
          { name: String(academicSession).trim() },
          ...(mongoose.Types.ObjectId.isValid(academicSession) ? [{ _id: academicSession }] : [])
        ]
      });
    }

    // 1. Find or create/update Series record
    let seriesDoc = await Series.findOne({
      department: deptDoc._id,
      name: cleanSeries
    });

    const previousSemester = seriesDoc?.currentSemester || '1st Semester';

    if (seriesDoc) {
      seriesDoc.currentSemester = cleanSemester;
      if (sessionDoc) {
        seriesDoc.academicSession = sessionDoc._id;
      }
      await seriesDoc.save();
    } else {
      seriesDoc = await Series.create({
        name: cleanSeries,
        department: deptDoc._id,
        departmentCode: deptDoc.code,
        currentSemester: cleanSemester,
        academicSession: sessionDoc?._id || null
      });
    }

    // 2. Build Student update query (Scoped strictly to this dept + series + optional section)
    const studentQuery = {
      $and: [
        { $or: [{ departmentRef: deptDoc._id }, { department: deptDoc.code }] },
        { $or: [{ series: cleanSeries }, { seriesRef: seriesDoc._id }] }
      ]
    };
    if (cleanSection) {
      studentQuery.section = cleanSection;
    }

    const updateFields = {
      semester: cleanSemester
    };
    if (sessionDoc) {
      updateFields.session = sessionDoc.name;
      updateFields.academicSessionRef = sessionDoc._id;
    }

    // 3. Atomically update all matching students without altering historical marks/attendance
    const updateResult = await Student.updateMany(studentQuery, { $set: updateFields });

    // 4. Calculate available offerings count for the new semester
    const normalizedNewSemester = normalizeSemesterLevel(cleanSemester);
    const availableOfferingsCount = await CourseOffering.countDocuments({
      department: deptDoc._id,
      seriesName: cleanSeries,
      $or: [
        { semesterLevel: normalizedNewSemester },
        { semesterName: cleanSemester }
      ]
    });

    // 5. Auditable Cohort Semester History Record
    let historyRecord = null;
    try {
      historyRecord = await CohortSemesterHistory.create({
        department: deptDoc._id,
        departmentCode: deptDoc.code,
        series: seriesDoc._id,
        seriesName: cleanSeries,
        academicSession: sessionDoc?._id || seriesDoc.academicSession || null,
        sessionName: sessionDoc?.name || '',
        section: cleanSection || 'ALL',
        previousSemester,
        newSemester: cleanSemester,
        effectiveAt: new Date(),
        changedBy: req.user?._id || req.authUser?._id || seriesDoc._id,
        changedByName: req.user?.name || 'System Administrator',
        reason: req.body.reason || 'Academic progression to next semester',
        affectedStudentsCount: updateResult.modifiedCount,
        availableOfferingsCount
      });
    } catch (histErr) {
      console.warn('CohortSemesterHistory creation warning:', histErr.message);
    }

    await logAudit({
      req,
      action: 'UPDATE_COHORT_SEMESTER',
      entity: 'Series',
      entityId: seriesDoc._id,
      details: `Progressed ${deptDoc.code} Series ${cleanSeries} ${cleanSection ? `(Section ${cleanSection})` : '(All Sections)'} from ${previousSemester} to ${cleanSemester} (${updateResult.modifiedCount} students updated)`,
      newValues: {
        department: deptDoc.code,
        series: cleanSeries,
        section: cleanSection || 'ALL',
        previousSemester,
        newSemester: cleanSemester,
        availableOfferings: availableOfferingsCount
      }
    });

    invalidateSeriesCache();
    invalidateSessionsCache();

    // 6. Broadcast real-time progression event via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.emit('cohort:semester-progressed', {
          department: deptDoc.code,
          series: cleanSeries,
          section: cleanSection || 'ALL',
          previousSemester,
          newSemester: cleanSemester,
          affectedStudents: updateResult.modifiedCount
        });
      }
    } catch (socketErr) {
      console.warn('Socket broadcast warning:', socketErr.message);
    }

    res.json({
      success: true,
      message: `Successfully progressed ${deptDoc.code} Series ${cleanSeries} ${cleanSection ? `Section ${cleanSection} ` : ''}from ${previousSemester} to ${cleanSemester} (${updateResult.modifiedCount} students updated).`,
      affectedStudents: updateResult.modifiedCount,
      previousSemester,
      currentSemester: cleanSemester,
      availableOfferingsCount,
      history: historyRecord,
      series: seriesDoc
    });
  } catch (err) {
    console.error('updateCohortSemester error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/academic/cohort-history ─────────────────────────────────
const getCohortSemesterHistory = async (req, res) => {
  try {
    const { department, series, seriesId } = req.query;
    const filter = {};
    if (seriesId) filter.series = seriesId;
    if (series) filter.seriesName = String(series).trim();
    if (department) filter.departmentCode = String(department).trim().toUpperCase();

    const history = await CohortSemesterHistory.find(filter)
      .sort({ effectiveAt: -1 })
      .populate('changedBy', 'name email role')
      .limit(50)
      .lean();

    res.json({ success: true, count: history.length, history });
  } catch (err) {
    console.error('getCohortSemesterHistory error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAcademicSessions,
  createAcademicSession,
  updateAcademicSession,
  getSemesters,
  createSemester,
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  getCohortPreview,
  updateCohortSemester,
  getCohortSemesterHistory
};
