const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const CourseOffering = require('../models/CourseOffering');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Get all faculties with aggregate counts
// @route GET /api/faculties
const getFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.find({ status: { $ne: 'archived' } }).sort({ name: 1 });
    
    // Enrich each faculty with department & counts
    const enriched = await Promise.all(faculties.map(async (f) => {
      const departments = await Department.find({ faculty: f._id, status: 'active' });
      const deptIds = departments.map(d => d._id);
      const deptCodes = departments.map(d => d.code);

      const [teacherCount, studentCount, offeringCount] = await Promise.all([
        Teacher.countDocuments({ $or: [{ facultyRef: f._id }, { department: { $in: deptCodes } }] }),
        Student.countDocuments({ $or: [{ facultyRef: f._id }, { department: { $in: deptCodes } }] }),
        CourseOffering.countDocuments({ department: { $in: deptIds } })
      ]);

      return {
        ...f.toObject(),
        departments,
        stats: {
          departmentCount: departments.length,
          teacherCount,
          studentCount,
          offeringCount
        }
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single faculty by ID
// @route GET /api/faculties/:id
const getFacultyById = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    const departments = await Department.find({ faculty: faculty._id, status: 'active' });
    res.json({ ...faculty.toObject(), departments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create new faculty
// @route POST /api/faculties
const createFaculty = async (req, res) => {
  try {
    const { name, code, deanName, description } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'Name and code are required' });

    const existing = await Faculty.findOne({ $or: [{ code: code.trim().toUpperCase() }, { name: name.trim() }] });
    if (existing) return res.status(400).json({ message: 'Faculty with this name or code already exists' });

    const faculty = await Faculty.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      deanName: deanName?.trim() || '',
      description: description?.trim() || ''
    });

    await logAudit({
      req,
      action: 'CREATE_FACULTY',
      entity: 'Faculty',
      entityId: faculty._id,
      details: `Created faculty ${faculty.name} (${faculty.code})`,
      newValues: faculty
    });

    res.status(201).json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update faculty
// @route PUT /api/faculties/:id
const updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

    const oldValues = { ...faculty.toObject() };
    const { name, code, deanName, description, status } = req.body;

    if (name) faculty.name = name.trim();
    if (code) faculty.code = code.trim().toUpperCase();
    if (deanName !== undefined) faculty.deanName = deanName.trim();
    if (description !== undefined) faculty.description = description.trim();
    if (status) faculty.status = status;

    await faculty.save();

    await logAudit({
      req,
      action: 'UPDATE_FACULTY',
      entity: 'Faculty',
      entityId: faculty._id,
      details: `Updated faculty ${faculty.name}`,
      oldValues,
      newValues: faculty
    });

    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete/Archive faculty
// @route DELETE /api/faculties/:id
const deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

    // Check if departments exist under faculty
    const deptCount = await Department.countDocuments({ faculty: faculty._id, status: 'active' });
    if (deptCount > 0) {
      faculty.status = 'archived';
      await faculty.save();
      return res.json({ message: `Faculty archived (${deptCount} active departments remain preserved)` });
    }

    await faculty.deleteOne();

    await logAudit({
      req,
      action: 'DELETE_FACULTY',
      entity: 'Faculty',
      entityId: req.params.id,
      details: `Deleted faculty ${faculty.name}`
    });

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty
};
