const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

// @desc Get audit logs with pagination & filtering
// @route GET /api/audit-logs
router.get('/', async (req, res) => {
  try {
    const { action, entity, userRole, page = 1, limit = 50 } = req.query;
    let query = {};
    if (action) query.action = action;
    if (entity) query.entity = entity;
    if (userRole) query.userRole = userRole;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
