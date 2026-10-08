const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');

// ── GET USERS (Search & Filter Directory) ─────────────────────────────────────
// GET /api/users
const getUsers = async (req, res) => {
  try {
    const { role, status, department, search, page = 1, limit = 50 } = req.query;
    const query = {};

    // 1. Role filter
    if (role) {
      query.role = role;
    } else {
      // By default, exclude admin from user directory unless explicitly queried by Admin
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        query.role = { $ne: 'admin' };
      }
    }

    // 2. Status filter
    if (status) {
      query.status = status.toUpperCase();
    }

    // 3. Department Isolation: Department Head can ONLY query their own department
    if (req.user.role === 'department_head') {
      const authorizedDept = req.user.departmentCode || req.user.department;
      query.department = authorizedDept;
    } else if (department) {
      query.department = department.toUpperCase();
    }

    // 4. Search by Name, LoginIdentifier, Email, Phone
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { loginIdentifier: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET USER BY ID ────────────────────────────────────────────────────────────
// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Department isolation check for department heads
    if (req.user.role === 'department_head') {
      const authorizedDept = req.user.departmentCode || req.user.department;
      if (user.department && user.department !== authorizedDept) {
        return res.status(403).json({ success: false, message: 'Access denied: Department isolation violation' });
      }
    }

    let profile = null;
    if (user.role === 'student') profile = await Student.findById(user.profileRef);
    else if (user.role === 'teacher') profile = await Teacher.findById(user.profileRef);
    else if (user.role === 'department_head' || user.role === 'admin') profile = await Admin.findById(user.profileRef);

    res.json({
      success: true,
      user,
      profile
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE USER ACCOUNT STATUS ────────────────────────────────────────────────
// PATCH /api/users/:id/status
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!status || !allowed.includes(status.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid status. Allowed: ACTIVE, INACTIVE, SUSPENDED' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Department head can only manage users in their department and cannot manage Admins
    if (req.user.role === 'department_head') {
      const authorizedDept = req.user.departmentCode || req.user.department;
      if (user.department !== authorizedDept || user.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot change status for this user' });
      }
    }

    const oldStatus = user.status;
    user.status = status.toUpperCase();
    await user.save();

    // Sync status to profile doc
    if (user.role === 'student' && user.profileRef) {
      const mapped = status.toUpperCase() === 'ACTIVE' ? 'active' : (status.toUpperCase() === 'SUSPENDED' ? 'suspended' : 'inactive');
      await Student.findByIdAndUpdate(user.profileRef, { status: mapped });
    } else if (user.role === 'teacher' && user.profileRef) {
      const mapped = status.toUpperCase() === 'ACTIVE' ? 'active' : 'inactive';
      await Teacher.findByIdAndUpdate(user.profileRef, { status: mapped });
    } else if (user.role === 'department_head' && user.profileRef) {
      const mapped = status.toUpperCase() === 'ACTIVE' ? 'active' : 'inactive';
      await Admin.findByIdAndUpdate(user.profileRef, { status: mapped });
    }

    await AuditLog.create({
      userId: req.user.userId || req.user._id,
      userRole: req.user.role,
      userName: req.user.name,
      action: 'USER_STATUS_CHANGED',
      entity: 'User',
      entityId: String(user._id),
      details: `Status of ${user.loginIdentifier} changed from ${oldStatus} to ${user.status}`,
    });

    res.json({
      success: true,
      message: `User status updated to ${user.status}`,
      user: {
        _id: user._id,
        loginIdentifier: user.loginIdentifier,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN RESET USER PASSWORD ─────────────────────────────────────────────────
// POST /api/users/:id/reset-password
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.user.role === 'department_head') {
      const authorizedDept = req.user.departmentCode || req.user.department;
      if (user.department !== authorizedDept || user.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied: Cannot reset password for this user' });
      }
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.mustChangePassword = true;
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    await user.save();

    // Sync to profile doc
    if (user.role === 'student' && user.profileRef) {
      await Student.findByIdAndUpdate(user.profileRef, { password: newPassword });
    } else if (user.role === 'teacher' && user.profileRef) {
      await Teacher.findByIdAndUpdate(user.profileRef, { password: newPassword });
    } else if (user.role === 'department_head' && user.profileRef) {
      await Admin.findByIdAndUpdate(user.profileRef, { password: newPassword });
    }

    res.json({
      success: true,
      message: `Password reset successfully for ${user.loginIdentifier}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  resetUserPassword
};
