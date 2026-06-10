const Request = require('../models/Request');

// POST /api/student/request — student sends request for detailed marks
const createRequest = async (req, res) => {
  try {
    const { courseCode, teacherId } = req.body;
    if (!courseCode || !teacherId) {
      return res.status(400).json({ message: 'courseCode and teacherId are required' });
    }

    // Upsert: if a request already exists for this student+course, update it
    const existing = await Request.findOne({
      student: req.user._id,
      course:  courseCode
    });

    if (existing) {
      if (existing.status === 'Pending') {
        return res.status(400).json({ message: 'A pending request already exists for this course.' });
      }
      if (existing.status === 'Accepted') {
        return res.status(400).json({ message: 'Your request for this course is already accepted.' });
      }
      // If Rejected → reset to Pending (re-request)
      existing.status  = 'Pending';
      existing.teacher = teacherId;
      await existing.save();
      return res.json(existing);
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

// GET /api/teacher/requests — teacher sees requests (optionally filtered by course)
const getTeacherRequests = async (req, res) => {
  try {
    const teacherId = req.user.teacherId;
    const query = { teacher: teacherId };

    // Optional course filter
    if (req.query.course) {
      query.course = req.query.course;
    }

    const requests = await Request.find(query)
      .populate('student', 'name rollNumber series department')
      .sort({ createdAt: -1 });

    // Filter out requests with deleted/null student documents
    const validRequests = requests.filter(r => r.student !== null);
    res.json(validRequests);
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

    // Populate student info before sending response
    await request.populate('student', 'name rollNumber series department');

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, getStudentRequests, getTeacherRequests, updateRequest };
