const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  req,
  action,
  entity,
  entityType,
  entityId = '',
  details = '',
  oldValues = null,
  oldData = null,
  newValues = null,
  newData = null
}) => {
  try {
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';
    
    const adminId = req?.user?.role === 'admin' || req?.user?.role === 'department_head' ? req?.user?._id : null;
    const adminEmail = req?.user?.email || '';

    const resolvedEntity = entity || entityType || 'System';
    const resolvedOld = oldValues || oldData || null;
    const resolvedNew = newValues || newData || null;
    
    await AuditLog.create({
      userId: req?.user?._id || null,
      adminId,
      adminEmail,
      userRole: req?.user?.role || 'system',
      userName: req?.user?.name || req?.user?.username || 'System Admin',
      action,
      entity: resolvedEntity,
      entityType: resolvedEntity,
      entityId: String(entityId),
      details,
      oldValues: resolvedOld,
      oldData: resolvedOld,
      newValues: resolvedNew,
      newData: resolvedNew,
      ipAddress,
      userAgent
    });
  } catch (err) {
    console.error('AuditLog creation failed:', err.message);
  }
};

module.exports = { logAudit };
