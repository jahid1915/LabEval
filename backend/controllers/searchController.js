const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const Department = require('../models/Department');

// @desc Global multi-entity search with ReDoS defense & lean query performance
// @route GET /api/search?q=query
const globalSearch = async (req, res) => {
  try {
    const rawQuery = req.query.q?.trim();
    if (!rawQuery || rawQuery.length < 2) {
      return res.json({ teachers: [], students: [], courses: [], offerings: [], departments: [] });
    }

    // Escape regex metacharacters to eliminate ReDoS vulnerabilities and regex syntax errors
    const safePattern = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safePattern, 'i');

    const [teachers, students, courses, offerings, departments] = await Promise.all([
      Teacher.find({
        $or: [{ name: regex }, { teacherId: regex }, { department: regex }, { email: regex }]
      })
        .select('name teacherId designation department dutyStatus avatarUrl')
        .limit(8)
        .lean(),

      Student.find({
        $or: [{ name: regex }, { rollNumber: regex }, { department: regex }, { series: regex }]
      })
        .select('name rollNumber department series status')
        .limit(8)
        .lean(),

      Course.find({
        $or: [{ courseCode: regex }, { courseName: regex }, { departmentCode: regex }]
      })
        .select('courseCode courseName departmentCode credit courseType')
        .limit(8)
        .lean(),

      CourseOffering.find({
        $or: [{ courseCode: regex }, { courseName: regex }, { departmentCode: regex }, { seriesName: regex }]
      })
        .select('courseCode courseName seriesName sessionName departmentCode isMarksPublished')
        .limit(8)
        .lean(),

      Department.find({
        $or: [{ name: regex }, { code: regex }]
      })
        .select('name code headName')
        .limit(5)
        .lean()
    ]);

    res.json({
      teachers,
      students,
      courses,
      offerings,
      departments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { globalSearch };
