const AcademicSession = require('../models/AcademicSession');
const Semester = require('../models/Semester');
const Series = require('../models/Series');
const Department = require('../models/Department');
const Student = require('../models/Student');
const CourseOffering = require('../models/CourseOffering');
const { logAudit } = require('../middleware/auditMiddleware');

// ── Academic Sessions ──────────────────────────────────────────────────
const getAcademicSessions = async (req, res) => {
  try {
    const sessions = await AcademicSession.find().sort({ year: -1 });
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
      return res.json({ message: `Series archived (${studentCount} students preserved)` });
    }

    await series.deleteOne();
    res.json({ message: 'Series deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  deleteSeries
};
