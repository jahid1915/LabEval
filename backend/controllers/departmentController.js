const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Series = require('../models/Series');
const CourseOffering = require('../models/CourseOffering');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Get all departments with optional faculty filter
// @route GET /api/departments
const getDepartments = async (req, res) => {
  try {
    const { facultyId, search } = req.query;
    let query = { status: { $ne: 'archived' } };
    if (facultyId) query.faculty = facultyId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(query)
      .populate('faculty', 'name code')
      .populate('headTeacher', 'name teacherId designation')
      .sort({ code: 1 });

    const enriched = await Promise.all(departments.map(async (d) => {
      const [teacherCount, studentCount, courseCount, seriesCount, offeringCount] = await Promise.all([
        Teacher.countDocuments({ $or: [{ departmentRef: d._id }, { department: d.code }] }),
        Student.countDocuments({ $or: [{ departmentRef: d._id }, { department: d.code }] }),
        Course.countDocuments({ $or: [{ department: d._id }, { departmentCode: d.code }] }),
        Series.countDocuments({ $or: [{ department: d._id }, { departmentCode: d.code }] }),
        CourseOffering.countDocuments({ $or: [{ department: d._id }, { departmentCode: d.code }] })
      ]);

      return {
        ...d.toObject(),
        stats: {
          teacherCount,
          studentCount,
          courseCount,
          seriesCount,
          offeringCount
        }
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single department by ID
// @route GET /api/departments/:id
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('faculty', 'name code')
      .populate('headTeacher', 'name teacherId designation');
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const series = await Series.find({ department: department._id }).sort({ name: -1 });
    const courses = await Course.find({ department: department._id }).sort({ courseCode: 1 });

    res.json({ ...department.toObject(), series, courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create new department
// @route POST /api/departments
const createDepartment = async (req, res) => {
  try {
    const { name, code, faculty, headName, headTeacher, contactEmail } = req.body;
    if (!name || !code || !faculty) {
      return res.status(400).json({ message: 'Name, code, and faculty are required' });
    }

    const facultyDoc = await Faculty.findById(faculty);
    if (!facultyDoc) return res.status(400).json({ message: 'Invalid Faculty ID' });

    const existing = await Department.findOne({ $or: [{ code: code.trim().toUpperCase() }, { name: name.trim() }] });
    if (existing) return res.status(400).json({ message: 'Department with this name or code already exists' });

    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      faculty: facultyDoc._id,
      headName: headName?.trim() || '',
      headTeacher: headTeacher || null,
      contactEmail: contactEmail?.trim() || ''
    });

    await logAudit({
      req,
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entityId: department._id,
      details: `Created department ${department.name} (${department.code}) in ${facultyDoc.name}`,
      newValues: department
    });

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update department
// @route PUT /api/departments/:id
const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const oldValues = { ...department.toObject() };
    const { name, code, faculty, headName, headTeacher, contactEmail, status } = req.body;

    if (name) department.name = name.trim();
    if (code) department.code = code.trim().toUpperCase();
    if (faculty) department.faculty = faculty;
    if (headName !== undefined) department.headName = headName.trim();
    if (headTeacher !== undefined) department.headTeacher = headTeacher || null;
    if (contactEmail !== undefined) department.contactEmail = contactEmail.trim();
    if (status) department.status = status;

    await department.save();

    await logAudit({
      req,
      action: 'UPDATE_DEPARTMENT',
      entity: 'Department',
      entityId: department._id,
      details: `Updated department ${department.name}`,
      oldValues,
      newValues: department
    });

    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete/Archive department
// @route DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const [teacherCount, studentCount] = await Promise.all([
      Teacher.countDocuments({ $or: [{ departmentRef: department._id }, { department: department.code }] }),
      Student.countDocuments({ $or: [{ departmentRef: department._id }, { department: department.code }] })
    ]);

    if (teacherCount > 0 || studentCount > 0) {
      department.status = 'archived';
      await department.save();
      return res.json({ message: `Department archived (${teacherCount} teachers & ${studentCount} students preserved)` });
    }

    await department.deleteOne();

    await logAudit({
      req,
      action: 'DELETE_DEPARTMENT',
      entity: 'Department',
      entityId: req.params.id,
      details: `Deleted department ${department.name}`
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
