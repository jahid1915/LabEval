const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  req,
  action,
  entity,
  entityId = '',
  details = '',
  oldValues = null,
  newValues = null
}) => {
  try {
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';
    
    await AuditLog.create({
      userId: req?.user?._id || null,
      userRole: req?.user?.role || 'system',
      userName: req?.user?.name || req?.user?.username || 'System Admin',
      action,
      entity,
      entityId: String(entityId),
      details,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    });
  } catch (err) {
    console.error('AuditLog creation failed:', err.message);
  }
};

module.exports = { logAudit };
