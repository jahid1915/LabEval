const LeaveRequest = require('../models/LeaveRequest');
const Teacher = require('../models/Teacher');
const { syncTeacherDutyStatuses } = require('../utils/dutyStatusCron');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Get teacher's own leave requests
// @route GET /api/leaves/my
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ teacher: req.user._id }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Submit a leave request (Teacher)
// @route POST /api/leaves
const submitLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, supportingDocUrl } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Leave type, start date, end date, and reason are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be earlier than start date' });
    }

    // Check for overlapping pending or approved leave
    const overlapping = await LeaveRequest.findOne({
      teacher: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({ message: 'You already have an active or pending leave request in this date range.' });
    }

    const leave = await LeaveRequest.create({
      teacher: req.user._id,
      teacherId: req.user.teacherId,
      teacherName: req.user.name,
      department: req.user.department,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      supportingDocUrl: supportingDocUrl || '',
      status: 'pending'
    });

    await logAudit({
      req,
      action: 'SUBMIT_LEAVE_REQUEST',
      entity: 'LeaveRequest',
      entityId: leave._id,
      details: `${req.user.name} submitted ${leaveType} leave from ${start.toDateString()} to ${end.toDateString()}`,
      newValues: leave
    });

    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Cancel pending leave (Teacher)
// @route PATCH /api/leaves/:id/cancel
const cancelLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel a leave with status '${leave.status}'` });
    }

    leave.status = 'cancelled';
    await leave.save();
    res.json({ message: 'Leave request cancelled successfully', leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all leave requests (Admin)
// @route GET /api/leaves
const getAllLeaves = async (req, res) => {
  try {
    const { status, department, teacherId } = req.query;
    let query = {};
    if (status) query.status = status;
    if (department) query.department = department.toUpperCase();
    if (teacherId) query.teacherId = teacherId.toUpperCase();

    const leaves = await LeaveRequest.find(query)
      .populate('teacher', 'name teacherId designation department contactNo avatarUrl dutyStatus')
      .populate('reviewedBy', 'name username email')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Review / Approve / Reject leave (Admin)
// @route PATCH /api/leaves/:id/review
const reviewLeave = async (req, res) => {
  try {
    const { status, reviewRemarks } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('teacher');
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    leave.status = status;
    leave.reviewRemarks = reviewRemarks?.trim() || '';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    // Trigger duty status sync immediately
    await syncTeacherDutyStatuses();

    await logAudit({
      req,
      action: status === 'approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
      entity: 'LeaveRequest',
      entityId: leave._id,
      details: `${status === 'approved' ? 'Approved' : 'Rejected'} leave for ${leave.teacherName} (${leave.teacherId})`
    });

    res.json({ message: `Leave request ${status} successfully`, leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyLeaves,
  submitLeave,
  cancelLeave,
  getAllLeaves,
  reviewLeave
};
