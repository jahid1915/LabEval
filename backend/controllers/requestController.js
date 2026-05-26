const Request = require('../models/Request');
const Student = require('../models/Student');

// POST /api/student/request — student sends request for detailed marks
const createRequest = async (req, res) => {
  try {
    const { courseCode, teacherId } = req.body;
    if (!courseCode || !teacherId) {
      return res.status(400).json({ message: 'courseCode and teacherId are required' });
    }

    // Check if a pending request already exists
    const existing = await Request.findOne({
      student:  req.user._id,
      course:   courseCode,
      status:   'Pending'
    });
    if (existing) {
      return res.status(400).json({ message: 'A pending request already exists for this course.' });
    }

    const request = await Request.create({
      student: req.user._id,
      course:  courseCode,
      teacher: teacherId,
      status:  'Pending'
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/student/requests — student checks status of their requests
const getStudentRequests = async (req, res) => {
  try {
    const requests = await Request.find({ student: req.user._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/teacher/requests — teacher sees all pending requests
const getTeacherRequests = async (req, res) => {
  try {
    const Teacher = require('../models/Teacher');
    const teacher = await Teacher.findById(req.user._id);
    const requests = await Request.find({ teacher: teacher.teacherId })
      .populate('student', 'name rollNumber series department')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/teacher/requests/:id — teacher accepts or rejects a request
const updateRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'Accepted' or 'Rejected'
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Accepted or Rejected' });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, getStudentRequests, getTeacherRequests, updateRequest };
