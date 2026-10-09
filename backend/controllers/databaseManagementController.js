const mongoose = require('mongoose');
const { ENTITY_REGISTRY, getEntityConfig } = require('../services/databaseEntityRegistry');
const AuditLog = require('../models/AuditLog');

/**
 * GET /api/admin/database/entities
 * Returns registered database entities with real MongoDB document counts and classification.
 */
const getEntitiesOverview = async (req, res) => {
  try {
    const keys = Object.keys(ENTITY_REGISTRY);

    // Parallel count queries using lean countDocuments()
    const counts = await Promise.all(
      keys.map(async (key) => {
        const config = ENTITY_REGISTRY[key];
        try {
          const count = await config.model.countDocuments({});
          return { key, count, status: 'Healthy' };
        } catch (err) {
          console.error(`Count error for ${key}:`, err.message);
          return { key, count: 0, status: 'Degraded' };
        }
      })
    );

    const countMap = new Map(counts.map(c => [c.key, c]));

    const entities = keys.map(key => {
      const cfg = ENTITY_REGISTRY[key];
      const countInfo = countMap.get(key) || { count: 0, status: 'Healthy' };
      return {
        key: cfg.key,
        label: cfg.label,
        modelName: cfg.modelName,
        category: cfg.category,
        description: cfg.description,
        icon: cfg.icon,
        recordsCount: countInfo.count,
        status: countInfo.status,
        canEdit: cfg.category === 'MANAGEABLE' && cfg.editableFields.length > 0,
        canDelete: cfg.category === 'MANAGEABLE' && cfg.deletePolicy !== 'DENIED',
        filterFields: cfg.filterFields || [],
        listFields: cfg.listFields || []
      };
    });

    res.json({
      success: true,
      totalEntities: entities.length,
      entities
    });
  } catch (error) {
    console.error('getEntitiesOverview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/database/:entity
 * Paginated, indexed, lean record query for any registered entity.
 */
const getEntityRecords = async (req, res) => {
  try {
    const { entity } = req.params;
    const config = getEntityConfig(entity);
    if (!config) {
      return res.status(404).json({ success: false, message: `Unknown database entity '${entity}'` });
    }

    const {
      page = 1,
      limit = 25,
      search = '',
      sortBy,
      sortOrder = 'asc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // 1. Text search across configured indexed fields
    if (search && search.trim() && config.searchFields?.length) {
      const term = search.trim();
      query.$or = config.searchFields.map(field => ({
        [field]: { $regex: term, $options: 'i' }
      }));
    }

    // 2. Dynamic field filters
    if (config.filterFields) {
      config.filterFields.forEach(filter => {
        const val = req.query[filter.key];
        if (val && val !== 'ALL' && val !== '') {
          query[filter.key] = val === 'true' ? true : (val === 'false' ? false : val);
        }
      });
    }

    // 3. Sorting
    const sort = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else if (config.defaultSort) {
      Object.assign(sort, config.defaultSort);
    } else {
      sort._id = -1;
    }

    // 4. Safe Projection: exclude sensitive fields
    const projection = {};
    if (config.protectedFields) {
      config.protectedFields.forEach(p => {
        if (p !== '*') projection[p] = 0;
      });
    }
    // Universal security projection
    projection.password = 0;
    projection.passwordHash = 0;
    projection.resetPasswordToken = 0;
    projection.__v = 0;

    const [total, records] = await Promise.all([
      config.model.countDocuments(query),
      config.model.find(query)
        .select(projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    res.json({
      success: true,
      entity: config.key,
      label: config.label,
      category: config.category,
      listFields: config.listFields,
      filterFields: config.filterFields,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      records
    });
  } catch (error) {
    console.error('getEntityRecords error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/database/:entity/:id
 * Retrieves single record with safe projection.
 */
const getEntityRecordById = async (req, res) => {
  try {
    const { entity, id } = req.params;
    const config = getEntityConfig(entity);
    if (!config) return res.status(404).json({ success: false, message: `Unknown entity '${entity}'` });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record identifier' });
    }

    const record = await config.model.findById(id).select('-password -passwordHash -__v').lean();
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    res.json({
      success: true,
      entity: config.key,
      label: config.label,
      category: config.category,
      detailFields: config.detailFields,
      editableFields: config.editableFields,
      record
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/database/:entity/:id/dependencies
 * Analyzes dependent records before deletion.
 */
const getEntityDependencies = async (req, res) => {
  try {
    const { entity, id } = req.params;
    const config = getEntityConfig(entity);
    if (!config) return res.status(404).json({ success: false, message: `Unknown entity '${entity}'` });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record identifier' });
    }

    const deps = config.checkDependencies ? await config.checkDependencies(id) : { count: 0, details: [] };

    res.json({
      success: true,
      entity: config.key,
      id,
      dependencyCount: deps.count,
      dependencies: deps.details,
      deletePolicy: config.deletePolicy
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/admin/database/:entity/:id
 * Strictly field-validated master record update with audit logging.
 */
const updateEntityRecord = async (req, res) => {
  try {
    const { entity, id } = req.params;
    const config = getEntityConfig(entity);
    if (!config) return res.status(404).json({ success: false, message: `Unknown entity '${entity}'` });

    if (config.category === 'READ_ONLY') {
      return res.status(403).json({ success: false, message: `Entity '${entity}' is read-only and cannot be modified.` });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record identifier' });
    }

    // Whitelist input to allowed editableFields only
    const updatePayload = {};
    const allowed = new Set(config.editableFields || []);

    for (const [key, value] of Object.entries(req.body)) {
      if (allowed.has(key)) {
        updatePayload[key] = value;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid editable fields provided in payload' });
    }

    const updated = await config.model.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).select('-password -passwordHash -__v').lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Record not found' });

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role || 'admin',
      userName: req.user.name || 'System Administrator',
      action: 'DATABASE_RECORD_UPDATED',
      entity: config.modelName,
      entityId: String(id),
      details: `Updated fields: [${Object.keys(updatePayload).join(', ')}] on ${config.label} (${id})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(e => console.error('AuditLog error:', e.message));

    res.json({
      success: true,
      message: `${config.label} record updated successfully`,
      record: updated
    });
  } catch (error) {
    console.error('updateEntityRecord error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/admin/database/:entity/:id
 * Safe deletion with dependency checking, archiving option, and audit logging.
 */
const deleteEntityRecord = async (req, res) => {
  try {
    const { entity, id } = req.params;
    const { action = 'archive', confirmText = '' } = req.body; // 'archive' | 'permanent'
    const config = getEntityConfig(entity);
    if (!config) return res.status(404).json({ success: false, message: `Unknown entity '${entity}'` });

    if (config.deletePolicy === 'DENIED') {
      return res.status(403).json({ success: false, message: `Deletion of ${config.label} records is strictly prohibited.` });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record identifier' });
    }

    // Check dependencies
    const deps = config.checkDependencies ? await config.checkDependencies(id) : { count: 0, details: [] };

    if (action === 'permanent') {
      if (confirmText !== 'DELETE') {
        return res.status(400).json({
          success: false,
          message: 'Permanent deletion requires confirming with exact text "DELETE"'
        });
      }

      await config.model.findByIdAndDelete(id);

      await AuditLog.create({
        userId: req.user._id,
        userRole: req.user.role || 'admin',
        userName: req.user.name || 'System Administrator',
        action: 'DATABASE_RECORD_DELETED',
        entity: config.modelName,
        entityId: String(id),
        details: `Permanently deleted ${config.label} record (${id}). Prior dependencies: ${deps.count}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(e => console.error('AuditLog error:', e.message));

      return res.json({
        success: true,
        message: `${config.label} record permanently deleted.`
      });
    }

    // Default action: Safe Archive / Deactivate
    const hasStatusField = config.editableFields?.includes('status');
    if (hasStatusField) {
      await config.model.findByIdAndUpdate(id, { status: 'inactive' });
      await AuditLog.create({
        userId: req.user._id,
        userRole: req.user.role || 'admin',
        userName: req.user.name || 'System Administrator',
        action: 'DATABASE_RECORD_ARCHIVED',
        entity: config.modelName,
        entityId: String(id),
        details: `Archived ${config.label} record (${id}) to inactive status.`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(e => console.error('AuditLog error:', e.message));

      return res.json({
        success: true,
        message: `${config.label} record safely archived to inactive status.`
      });
    }

    // If no status field, delete directly if 0 dependencies
    if (deps.count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete record: ${deps.count} dependent record(s) found across the system.`,
        dependencies: deps.details
      });
    }

    await config.model.findByIdAndDelete(id);

    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role || 'admin',
      userName: req.user.name || 'System Administrator',
      action: 'DATABASE_RECORD_DELETED',
      entity: config.modelName,
      entityId: String(id),
      details: `Safely deleted ${config.label} record (${id}) with 0 dependencies.`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(e => console.error('AuditLog error:', e.message));

    res.json({
      success: true,
      message: `${config.label} record deleted successfully.`
    });
  } catch (error) {
    console.error('deleteEntityRecord error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEntitiesOverview,
  getEntityRecords,
  getEntityRecordById,
  getEntityDependencies,
  updateEntityRecord,
  deleteEntityRecord
};
