const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Report     = require('../models/Report');
const Performance = require('../models/Performance');
const Quiz       = require('../models/Quiz');
const Test       = require('../models/Test');
const Others     = require('../models/Others');

// @desc  Get students by dept + series query
// @route GET /api/teacher/students/any?department=ETE&series=22
// @route GET /api/teacher/students/:courseId (legacy)
const getStudentsByCourse = async (req, res) => {
  try {
    const { department, series } = req.query;
    let query = {};
    if (department) query.department = department.toUpperCase();
    if (series)     query.series     = series;
    const students = await Student.find(query).sort({ rollNumber: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Bulk Attendance + Report save ─────────────────────────────────
// @desc  Save attendance + auto-report for all students in one request
// @route POST /api/teacher/attendance/bulk
// @body  { courseId, date, dayName, records: [{ studentId, attended, reportSubmitted }] }
const bulkSaveAttendance = async (req, res) => {
  try {
    const { courseId, date, dayName, records } = req.body;
    if (!courseId || !date || !dayName || !Array.isArray(records)) {
      return res.status(400).json({ message: 'courseId, date, dayName, and records[] are required' });
    }

    const ops = records.map(async ({ studentId, attended, reportSubmitted }) => {
      const attStatus = attended ? 'Present' : 'Absent';
      const repStatus = reportSubmitted ? 'Submitted' : 'Not Submitted';
      const dateObj   = new Date(date);

      // Upsert Attendance
      await Attendance.findOneAndUpdate(
        { student: studentId, course: courseId, dayName },
        { student: studentId, course: courseId, date: dateObj, dayName, status: attStatus, teacher: req.user._id },
        { upsert: true, new: true }
      );

      // Upsert Report
      await Report.findOneAndUpdate(
        { student: studentId, course: courseId, dayName },
        { student: studentId, course: courseId, date: dateObj, dayName, status: repStatus, teacher: req.user._id },
        { upsert: true, new: true }
      );
    });

    await Promise.all(ops);
    res.json({ message: 'Attendance and reports saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Generic upsert for single-record models ────────────────────────
const saveLabRecord = async (req, res, Model) => {
  try {
    const { studentId, courseId, date, marks, status, type, dayName } = req.body;

    // Validate marks against course's assessmentConfig if marks are provided
    if (marks !== undefined && marks !== null) {
      const Course = require('../models/Course');
      const courseDoc = await Course.findOne({ courseCode: courseId.trim().toUpperCase(), teacherId: req.user.teacherId });
      if (courseDoc && courseDoc.assessmentConfig) {
        let configKey = '';
        if (Model.modelName === 'Performance') configKey = 'performance';
        else if (Model.modelName === 'Quiz') configKey = 'quiz';
        else if (Model.modelName === 'Test') configKey = 'test';
        else if (Model.modelName === 'Others') configKey = 'others';

        if (configKey) {
          const maxAllowed = courseDoc.assessmentConfig[configKey] ?? 75;
          if (marks > maxAllowed) {
            return res.status(400).json({ message: `Marks (${marks}) exceed maximum configured limit of ${maxAllowed} for ${configKey}.` });
          }
        }
      }
    }

    let query = { student: studentId, course: courseId };
    if (dayName) query.dayName = dayName;
    if (type)    query.type    = type;

    let record = await Model.findOne(query);
    if (record) {
      if (marks  !== undefined) record.marks  = marks;
      if (status !== undefined) record.status = status;
      record.teacher = req.user._id;
      await record.save();
    } else {
      const data = { student: studentId, course: courseId, teacher: req.user._id, date: date || new Date() };
      if (marks  !== undefined) data.marks  = marks;
      if (status !== undefined) data.status = status;
      if (type   !== undefined) data.type   = type;
      if (dayName !== undefined) data.dayName = dayName;
      record = await Model.create(data);
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveAttendance  = (req, res) => saveLabRecord(req, res, Attendance);
const saveReport      = (req, res) => saveLabRecord(req, res, Report);
const savePerformance = (req, res) => saveLabRecord(req, res, Performance);
const saveQuiz        = (req, res) => saveLabRecord(req, res, Quiz);
const saveTest        = (req, res) => saveLabRecord(req, res, Test);
const saveOthers      = (req, res) => saveLabRecord(req, res, Others);

// ── Bulk save for marks tables (Quiz / Test / Others) ─────────────
// @body { courseId, date, type (optional), records: [{ studentId, marks }] }
const bulkSaveMarks = async (req, res, Model) => {
  try {
    const { courseId, date, type, records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ message: 'records[] required' });
    const ops = records.map(({ studentId, marks }) => {
      const query = { student: studentId, course: courseId };
      if (type) query.type = type;
      const update = { student: studentId, course: courseId, date: date || new Date(), marks, teacher: req.user._id };
      if (type) update.type = type;
      return Model.findOneAndUpdate(query, update, { upsert: true, new: true });
    });
    const saved = await Promise.all(ops);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get Lab Records by model name
// @route GET /api/teacher/records/:model/:courseId
const getRecords = async (req, res) => {
  try {
    const { model, courseId } = req.params;
    const modelMap = {
      attendance:  Attendance,
      report:      Report,
      performance: Performance,
      quiz:        Quiz,
      test:        Test,
      others:      Others,
    };
    const ModelToUse = modelMap[model.toLowerCase()];
    if (!ModelToUse) return res.status(400).json({ message: 'Invalid model type' });

    const records = await ModelToUse.find({ course: courseId })
      .populate('student', 'name rollNumber')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStudentsByCourse,
  bulkSaveAttendance,
  saveAttendance,
  saveReport,
  savePerformance,
  saveQuiz,
  saveTest,
  saveOthers,
  getRecords,
};
