const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');

// @desc Global multi-entity search
// @route GET /api/search?q=query
const globalSearch = async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query || query.length < 2) {
      return res.json({ teachers: [], students: [], courses: [], offerings: [], departments: [] });
    }

    const regex = new RegExp(query, 'i');

    const [teachers, students, courses, offerings, departments] = await Promise.all([
      Teacher.find({
        $or: [{ name: regex }, { teacherId: regex }, { department: regex }, { email: regex }]
      }).select('name teacherId designation department dutyStatus avatarUrl').limit(8),

      Student.find({
        $or: [{ name: regex }, { rollNumber: regex }, { department: regex }, { series: regex }]
      }).select('name rollNumber department series status').limit(8),

      Course.find({
        $or: [{ courseCode: regex }, { courseName: regex }, { departmentCode: regex }]
      }).select('courseCode courseName departmentCode credit courseType').limit(8),

      CourseOffering.find({
        $or: [{ courseCode: regex }, { courseName: regex }, { departmentCode: regex }, { seriesName: regex }]
      }).select('courseCode courseName seriesName sessionName departmentCode isMarksPublished').limit(8),

      Department.find({
        $or: [{ name: regex }, { code: regex }]
      }).select('name code headName').limit(5)
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
