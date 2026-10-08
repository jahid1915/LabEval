const mongoose = require('mongoose');
const HeadshipTransferRequest = require('../models/HeadshipTransferRequest');
const DepartmentHeadHistory = require('../models/DepartmentHeadHistory');
const Department = require('../models/Department');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { invalidateAuthCache } = require('../middleware/authMiddleware');

// ── HEAD: POST /api/head/headship-transfer/request ────────────────────
const requestHeadshipTransfer = async (req, res) => {
  try {
    const deptCode = (req.user?.departmentCode || req.user?.department || '').toUpperCase();
    const { proposedHeadTeacherId, reason } = req.body;

    if (!proposedHeadTeacherId || !reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Proposed teacher and reason are required' });
    }

    const deptDoc = await Department.findOne({ code: deptCode }).lean();
    if (!deptDoc) return res.status(404).json({ success: false, message: 'Department not found' });

    // Find current head teacher
    let currentHeadTeacher = await Teacher.findOne({
      department: deptCode,
      $or: [
        { _id: req.user.profileRef },
        { teacherId: req.user.loginIdentifier?.toUpperCase() }
      ]
    }).lean();

    if (!currentHeadTeacher && deptDoc.headTeacher) {
      currentHeadTeacher = await Teacher.findById(deptDoc.headTeacher).lean();
    }

    // Find proposed teacher in same department
    const proposedTeacher = await Teacher.findOne({
      _id: proposedHeadTeacherId,
      department: deptCode,
      status: { $ne: 'inactive' }
    }).lean();

    if (!proposedTeacher) {
      return res.status(400).json({ success: false, message: 'Proposed teacher not found or is inactive in your department' });
    }

    if (currentHeadTeacher && String(currentHeadTeacher._id) === String(proposedTeacher._id)) {
      return res.status(400).json({ success: false, message: 'Proposed teacher cannot be the current head' });
    }

    // Find proposed teacher's User document
    const proposedUser = await User.findOne({
      $or: [
        { loginIdentifierLower: proposedTeacher.teacherId.toLowerCase() },
        { profileRef: proposedTeacher._id },
        { email: proposedTeacher.email?.toLowerCase() }
      ]
    }).lean();

    // Check for pending request
    const existingPending = await HeadshipTransferRequest.findOne({
      departmentCode: deptCode,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'A headship transfer request is already pending review by System Admin'
      });
    }

    const transferReq = await HeadshipTransferRequest.create({
      department: deptDoc._id,
      departmentCode: deptCode,
      currentHead: currentHeadTeacher?._id || req.user.profileRef,
      currentHeadUser: req.user._id,
      currentHeadName: req.user.name || currentHeadTeacher?.name || 'Current Head',
      proposedHead: proposedTeacher._id,
      proposedHeadUser: proposedUser?._id || null,
      proposedHeadName: proposedTeacher.name,
      reason: reason.trim(),
      status: 'pending'
    });

    await AuditLog.create({
      userId: req.user._id,
      userRole: 'department_head',
      userName: req.user.name,
      action: 'HEADSHIP_TRANSFER_REQUESTED',
      entity: 'HeadshipTransferRequest',
      entityId: String(transferReq._id),
      details: `Head ${req.user.name} requested transfer of ${deptCode} headship to ${proposedTeacher.name}. Reason: ${reason}`
    }).catch(e => console.error('AuditLog error:', e.message));

    res.status(201).json({
      success: true,
      message: 'Headship transfer request submitted successfully. It is now awaiting Admin review.',
      request: transferReq
    });
  } catch (error) {
    console.error('requestHeadshipTransfer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── HEAD: GET /api/head/headship-transfer/status ──────────────────────
const getHeadshipTransferStatus = async (req, res) => {
  try {
    const deptCode = (req.user?.departmentCode || req.user?.department || '').toUpperCase();
    const requests = await HeadshipTransferRequest.find({ departmentCode: deptCode })
      .populate('proposedHead', 'name teacherId designation email')
      .populate('currentHead', 'name teacherId designation')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      department: deptCode,
      requests
    });
  } catch (error) {
    console.error('getHeadshipTransferStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ADMIN: GET /api/admin/headship-transfers ──────────────────────────
const getAdminHeadshipTransfers = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const [requests, history] = await Promise.all([
      HeadshipTransferRequest.find(query)
        .populate('department', 'name code')
        .populate('proposedHead', 'name teacherId designation email')
        .populate('currentHead', 'name teacherId designation email')
        .sort({ createdAt: -1 })
        .lean(),
      DepartmentHeadHistory.find()
        .populate('department', 'name code')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    res.json({
      success: true,
      requests,
      history
    });
  } catch (error) {
    console.error('getAdminHeadshipTransfers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ADMIN: POST /api/admin/headship-transfers/:id/approve ─────────────
const approveAdminHeadshipTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes = '' } = req.body;

    const transferReq = await HeadshipTransferRequest.findById(id)
      .populate('department')
      .populate('proposedHead')
      .populate('currentHead');

    if (!transferReq) return res.status(404).json({ success: false, message: 'Transfer request not found' });
    if (transferReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${transferReq.status}` });
    }

    const dept = transferReq.department;
    const newHeadTeacher = transferReq.proposedHead;
    const oldHeadTeacher = transferReq.currentHead;

    // 1. Update Department record
    dept.headTeacher = newHeadTeacher._id;
    dept.headId = newHeadTeacher.teacherId;
    dept.headName = newHeadTeacher.name;
    dept.headEmail = newHeadTeacher.email || '';
    dept.headPhone = newHeadTeacher.contactNo || '';
    await dept.save();

    // 2. Update User roles
    // Demote old head to 'teacher'
    if (transferReq.currentHeadUser) {
      await User.updateOne({ _id: transferReq.currentHeadUser }, { role: 'teacher' });
      invalidateAuthCache(transferReq.currentHeadUser);
    }
    // Also find any User with profileRef matching old head teacher
    await User.updateOne({ profileRef: oldHeadTeacher?._id, role: 'department_head' }, { role: 'teacher' });

    // Promote new head to 'department_head'
    let newHeadUserDoc = await User.findOne({
      $or: [
        { _id: transferReq.proposedHeadUser },
        { profileRef: newHeadTeacher._id },
        { loginIdentifierLower: newHeadTeacher.teacherId.toLowerCase() }
      ]
    });

    if (newHeadUserDoc) {
      newHeadUserDoc.role = 'department_head';
      newHeadUserDoc.department = dept.code;
      newHeadUserDoc.departmentRef = dept._id;
      await newHeadUserDoc.save();
      invalidateAuthCache(newHeadUserDoc._id);
    }

    // 3. Close previous active DepartmentHeadHistory
    await DepartmentHeadHistory.updateMany(
      { department: dept._id, status: 'active' },
      { status: 'ended', endDate: new Date() }
    );

    // 4. Create new immutable DepartmentHeadHistory (Section 32)
    const historyEntry = await DepartmentHeadHistory.create({
      department: dept._id,
      departmentCode: dept.code,
      faculty: dept.faculty || null,
      previousHead: oldHeadTeacher?._id || null,
      previousHeadId: oldHeadTeacher?.teacherId || '',
      previousHeadName: oldHeadTeacher?.name || transferReq.currentHeadName,
      newHead: newHeadTeacher._id,
      newHeadId: newHeadTeacher.teacherId,
      newHeadName: newHeadTeacher.name,
      assignedBy: req.user._id,
      assignedByName: req.user.name || 'System Admin',
      reason: transferReq.reason || 'Admin approved headship transfer',
      effectiveDate: new Date(),
      status: 'active'
    });

    // 5. Update transfer request status
    transferReq.status = 'approved';
    transferReq.adminNotes = adminNotes;
    transferReq.reviewedBy = req.user._id;
    transferReq.reviewedAt = new Date();
    await transferReq.save();

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userRole: 'admin',
      userName: req.user.name,
      action: 'HEADSHIP_TRANSFER_APPROVED',
      entity: 'DepartmentHeadHistory',
      entityId: String(historyEntry._id),
      details: `Approved headship transfer for ${dept.code}: ${newHeadTeacher.name} is now Department Head. Previous Head: ${oldHeadTeacher?.name || 'N/A'}`
    }).catch(e => console.error('AuditLog error:', e.message));

    res.json({
      success: true,
      message: `Headship transfer approved successfully. ${newHeadTeacher.name} is now the Department Head of ${dept.code}.`,
      history: historyEntry
    });
  } catch (error) {
    console.error('approveAdminHeadshipTransfer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ADMIN: POST /api/admin/headship-transfers/:id/reject ──────────────
const rejectAdminHeadshipTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes = 'Rejected by Administrator' } = req.body;

    const transferReq = await HeadshipTransferRequest.findById(id);
    if (!transferReq) return res.status(404).json({ success: false, message: 'Transfer request not found' });
    if (transferReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${transferReq.status}` });
    }

    transferReq.status = 'rejected';
    transferReq.adminNotes = adminNotes;
    transferReq.reviewedBy = req.user._id;
    transferReq.reviewedAt = new Date();
    await transferReq.save();

    await AuditLog.create({
      userId: req.user._id,
      userRole: 'admin',
      userName: req.user.name,
      action: 'HEADSHIP_TRANSFER_REJECTED',
      entity: 'HeadshipTransferRequest',
      entityId: String(transferReq._id),
      details: `Rejected headship transfer for ${transferReq.departmentCode}. Reason: ${adminNotes}`
    }).catch(e => console.error('AuditLog error:', e.message));

    res.json({
      success: true,
      message: 'Headship transfer request rejected',
      request: transferReq
    });
  } catch (error) {
    console.error('rejectAdminHeadshipTransfer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  requestHeadshipTransfer,
  getHeadshipTransferStatus,
  getAdminHeadshipTransfers,
  approveAdminHeadshipTransfer,
  rejectAdminHeadshipTransfer
};
