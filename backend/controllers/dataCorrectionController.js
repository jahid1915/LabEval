const mongoose = require('mongoose');
const DataCorrectionRequest = require('../models/DataCorrectionRequest');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');

// ── HEAD: POST /api/head/students/request-correction ──────────────────
const requestDataCorrection = async (req, res) => {
  try {
    const deptCode = (req.user?.departmentCode || req.user?.department || '').toUpperCase();
    const { studentId, field, proposedValue, reason } = req.body;

    if (!studentId || !field || !proposedValue || !reason) {
      return res.status(400).json({ success: false, message: 'Student ID, field, proposed value, and reason are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (student.department !== deptCode) {
      return res.status(403).json({ success: false, message: 'Forbidden: Student belongs to another department' });
    }

    const currentValue = String(student[field] || '');

    const corrReq = await DataCorrectionRequest.create({
      student: student._id,
      studentRoll: student.rollNumber,
      studentName: student.name,
      departmentCode: deptCode,
      requestedBy: req.user._id,
      requestedByName: req.user.name || 'Department Head',
      field,
      currentValue,
      proposedValue: String(proposedValue).trim(),
      reason: reason.trim(),
      status: 'pending'
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: 'department_head',
      userName: req.user.name,
      action: 'DATA_CORRECTION_REQUESTED',
      entity: 'DataCorrectionRequest',
      entityId: String(corrReq._id),
      details: `Head ${req.user.name} requested correction of ${field} for student ${student.rollNumber} to "${proposedValue}". Reason: ${reason}`
    }).catch(e => console.error('AuditLog error:', e.message));

    res.status(201).json({
      success: true,
      message: 'Correction request submitted to Administrator for review.',
      request: corrReq
    });
  } catch (error) {
    console.error('requestDataCorrection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── HEAD: GET /api/head/students/correction-requests ──────────────────
const getHeadCorrectionRequests = async (req, res) => {
  try {
    const deptCode = (req.user?.departmentCode || req.user?.department || '').toUpperCase();
    const requests = await DataCorrectionRequest.find({ departmentCode: deptCode })
      .populate('student', 'name rollNumber session series semester')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) {
    console.error('getHeadCorrectionRequests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ADMIN: GET /api/admin/correction-requests ─────────────────────────
const getAdminCorrectionRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const requests = await DataCorrectionRequest.find(query)
      .populate('student', 'name rollNumber session series semester department')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) {
    console.error('getAdminCorrectionRequests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ADMIN: POST /api/admin/correction-requests/:id/approve ────────────
const approveAdminCorrectionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse = 'Approved by Administrator' } = req.body;

    const corrReq = await DataCorrectionRequest.findById(id);
    if (!corrReq) return res.status(404).json({ success: false, message: 'Request not found' });
    if (corrReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${corrReq.status}` });
    }

    const student = await Student.findById(corrReq.student);
    if (!student) return res.status(404).json({ success: false, message: 'Student record no longer exists' });

    // Apply master data correction
    student[corrReq.field] = corrReq.proposedValue;
    await student.save();

    corrReq.status = 'approved';
    corrReq.adminResponse = adminResponse;
    corrReq.reviewedBy = req.user._id;
    corrReq.reviewedAt = new Date();
    await corrReq.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: 'admin',
      userName: req.user.name,
      action: 'DATA_CORRECTION_APPROVED',
      entity: 'Student',
      entityId: String(student._id),
      details: `Admin approved data correction for ${student.rollNumber}: ${corrReq.field} updated to "${corrReq.proposedValue}"`
    }).catch(e => console.error('AuditLog error:', e.message));

    res.json({
      success: true,
      message: `Correction approved. Student ${student.rollNumber} ${corrReq.field} updated successfully.`,
      student
    });
  } catch (error) {
    console.error('approveAdminCorrectionRequest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ADMIN: POST /api/admin/correction-requests/:id/reject ─────────────
const rejectAdminCorrectionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse = 'Rejected by Administrator' } = req.body;

    const corrReq = await DataCorrectionRequest.findById(id);
    if (!corrReq) return res.status(404).json({ success: false, message: 'Request not found' });
    if (corrReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${corrReq.status}` });
    }

    corrReq.status = 'rejected';
    corrReq.adminResponse = adminResponse;
    corrReq.reviewedBy = req.user._id;
    corrReq.reviewedAt = new Date();
    await corrReq.save();

    res.json({ success: true, message: 'Correction request rejected' });
  } catch (error) {
    console.error('rejectAdminCorrectionRequest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  requestDataCorrection,
  getHeadCorrectionRequests,
  getAdminCorrectionRequests,
  approveAdminCorrectionRequest,
  rejectAdminCorrectionRequest
};
