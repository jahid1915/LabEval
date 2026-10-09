const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ENTITY_REGISTRY, getEntityConfig } = require('../services/databaseEntityRegistry');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const Series = require('../models/Series');
const AcademicSession = require('../models/AcademicSession');
const Course = require('../models/Course');
const CourseOffering = require('../models/CourseOffering');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

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
        colorTheme: cfg.colorTheme,
        recordsCount: countInfo.count,
        status: countInfo.status,
        canCreate: !!cfg.canCreate,
        canEdit: cfg.category === 'MANAGEABLE' && cfg.editableFields.length > 0,
        canDelete: cfg.category === 'MANAGEABLE' && cfg.deletePolicy !== 'DENIED',
        filterFields: cfg.filterFields || [],
        listFields: cfg.listFields || [],
        createFields: cfg.createFields || []
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

/**
 * GET /api/admin/database/:entity/schema
 * Returns the schema definition for adding a new record, plus live reference options.
 */
const getEntitySchema = async (req, res) => {
  try {
    const { entity } = req.params;
    const config = getEntityConfig(entity);
    if (!config) {
      return res.status(404).json({ success: false, message: `Unknown database entity '${entity}'` });
    }

    if (!config.canCreate || !config.createFields?.length) {
      return res.status(403).json({
        success: false,
        message: `Entity '${config.label}' is read-only or system-protected. Direct record creation is prohibited.`
      });
    }

    // Query active database records to populate dropdown choices
    const [departments, seriesList, sessions, faculties, courses] = await Promise.all([
      Department.find({ status: { $ne: 'inactive' } }).select('code name _id').sort({ code: 1 }).lean().catch(() => []),
      Series.find({ status: { $ne: 'archived' } }).select('name departmentCode currentSemester _id').sort({ name: -1 }).lean().catch(() => []),
      AcademicSession.find({ status: { $ne: 'ARCHIVED' } }).select('name year isCurrent _id').sort({ year: -1 }).lean().catch(() => []),
      Faculty.find({}).select('code name _id').sort({ code: 1 }).lean().catch(() => []),
      Course.find({ status: 'active' }).select('courseCode courseName credits departmentCode _id').sort({ courseCode: 1 }).lean().catch(() => [])
    ]);

    const referenceOptions = {
      departments: departments.map(d => ({ value: d.code, label: `${d.code} — ${d.name}`, id: d._id })),
      series: seriesList.map(s => ({ value: s.name, label: `${s.departmentCode ? s.departmentCode + ' ' : ''}Series ${s.name}`, id: s._id, departmentCode: s.departmentCode })),
      sessions: sessions.map(s => ({ value: s.name, label: `${s.name}${s.isCurrent ? ' (Current)' : ''}`, id: s._id })),
      faculties: faculties.map(f => ({ value: f._id, label: `${f.code} — ${f.name}`, code: f.code })),
      courses: courses.map(c => ({ value: c._id, label: `${c.courseCode}: ${c.courseName} (${c.credits} Cr)`, courseCode: c.courseCode, departmentCode: c.departmentCode }))
    };

    res.json({
      success: true,
      entity: config.key,
      label: config.label,
      modelName: config.modelName,
      colorTheme: config.colorTheme,
      canCreate: true,
      createFields: config.createFields,
      referenceOptions
    });
  } catch (error) {
    console.error('getEntitySchema error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/database/:entity
 * Dynamically creates a new record for the selected entity following backend schema validation,
 * foreign reference resolution, unique constraints, and unified user account creation where required.
 */
const createEntityRecord = async (req, res) => {
  try {
    const { entity } = req.params;
    const config = getEntityConfig(entity);
    if (!config) {
      return res.status(404).json({ success: false, message: `Unknown database entity '${entity}'` });
    }

    if (!config.canCreate || !config.createFields?.length) {
      return res.status(403).json({
        success: false,
        message: `Entity '${config.label}' is read-only or system-protected. Direct record creation is prohibited.`
      });
    }

    const payload = req.body || {};

    // 1. Validate required fields
    for (const field of config.createFields) {
      if (field.required) {
        const val = payload[field.key];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          return res.status(400).json({
            success: false,
            message: `Field '${field.label}' is required.`
          });
        }
      }
    }

    let createdDoc = null;

    // 2. Entity-specific creation logic
    if (entity === 'students') {
      const cleanRoll = String(payload.rollNumber).trim().toUpperCase();
      const cleanSeries = String(payload.series).trim();
      const cleanDept = String(payload.department).trim().toUpperCase();
      const cleanRegNo = payload.registrationNumber ? String(payload.registrationNumber).trim() : '';

      const exists = await Student.findOne({ rollNumber: cleanRoll });
      if (exists) {
        return res.status(400).json({ success: false, message: `Student roll number '${cleanRoll}' already exists.` });
      }

      const [deptDoc, seriesDoc, sessionDoc] = await Promise.all([
        Department.findOne({ code: cleanDept }),
        Series.findOne({ name: cleanSeries, departmentCode: cleanDept }),
        payload.session ? AcademicSession.findOne({ name: String(payload.session).trim() }) : null
      ]);

      const initialPassword = payload.password || cleanRegNo || cleanRoll;

      createdDoc = await Student.create({
        rollNumber: cleanRoll,
        name: String(payload.name).trim(),
        department: cleanDept,
        departmentRef: deptDoc?._id || null,
        facultyRef: deptDoc?.faculty || null,
        series: cleanSeries,
        seriesRef: seriesDoc?._id || null,
        registrationNumber: cleanRegNo,
        session: payload.session ? String(payload.session).trim() : (sessionDoc?.name || ''),
        academicSessionRef: sessionDoc?._id || null,
        semester: payload.semester ? String(payload.semester).trim() : (seriesDoc?.currentSemester || '1st Semester'),
        section: payload.section ? String(payload.section).trim().toUpperCase() : '',
        regularStatus: payload.regularStatus || 'Regular',
        status: payload.status || 'active',
        contactNo: payload.contactNo ? String(payload.contactNo).trim() : '',
        email: payload.email ? String(payload.email).trim().toLowerCase() : '',
        password: initialPassword
      });

      // Auto-provision unified User record for login
      try {
        let userDoc = await User.findOne({ loginIdentifierLower: cleanRoll.toLowerCase() });
        if (!userDoc) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(initialPassword, salt);
          userDoc = await User.create({
            loginIdentifier: cleanRoll,
            loginIdentifierLower: cleanRoll.toLowerCase(),
            passwordHash,
            role: 'student',
            status: payload.status === 'inactive' ? 'INACTIVE' : (payload.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE'),
            name: String(payload.name).trim(),
            email: payload.email ? String(payload.email).trim().toLowerCase() : '',
            phone: payload.contactNo ? String(payload.contactNo).trim() : '',
            department: cleanDept,
            departmentRef: deptDoc?._id || null,
            profileRef: createdDoc._id,
            profileModel: 'Student'
          });
          createdDoc.user = userDoc._id;
          await createdDoc.save();
        }
      } catch (userErr) {
        console.warn('Auto User provision warning for student:', userErr.message);
      }

    } else if (entity === 'teachers') {
      const cleanId = String(payload.teacherId).trim().toUpperCase();
      const cleanDept = String(payload.department).trim().toUpperCase();

      const exists = await Teacher.findOne({ teacherId: cleanId });
      if (exists) {
        return res.status(400).json({ success: false, message: `Teacher ID '${cleanId}' already exists.` });
      }

      const deptDoc = await Department.findOne({ code: cleanDept });
      const initialPassword = payload.password || cleanId;

      createdDoc = await Teacher.create({
        teacherId: cleanId,
        name: String(payload.name).trim(),
        department: cleanDept,
        departmentRef: deptDoc?._id || null,
        facultyRef: deptDoc?.faculty || null,
        designation: payload.designation || 'Lecturer',
        contactNo: String(payload.contactNo || 'N/A').trim(),
        email: payload.email ? String(payload.email).trim().toLowerCase() : '',
        dutyStatus: payload.dutyStatus || 'ON_DUTY',
        specialization: payload.specialization ? String(payload.specialization).trim() : '',
        password: initialPassword
      });

      // Auto-provision unified User record for login
      try {
        let userDoc = await User.findOne({ loginIdentifierLower: cleanId.toLowerCase() });
        if (!userDoc) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(initialPassword, salt);
          userDoc = await User.create({
            loginIdentifier: cleanId,
            loginIdentifierLower: cleanId.toLowerCase(),
            passwordHash,
            role: 'teacher',
            status: 'ACTIVE',
            name: String(payload.name).trim(),
            email: payload.email ? String(payload.email).trim().toLowerCase() : '',
            phone: String(payload.contactNo || '').trim(),
            department: cleanDept,
            departmentRef: deptDoc?._id || null,
            profileRef: createdDoc._id,
            profileModel: 'Teacher'
          });
          createdDoc.user = userDoc._id;
          await createdDoc.save();
        }
      } catch (userErr) {
        console.warn('Auto User provision warning for teacher:', userErr.message);
      }

    } else if (entity === 'courses') {
      const cleanCode = String(payload.courseCode).trim().toUpperCase();
      const cleanDept = String(payload.departmentCode).trim().toUpperCase();

      const exists = await Course.findOne({ courseCode: cleanCode });
      if (exists) {
        return res.status(400).json({ success: false, message: `Course Code '${cleanCode}' already exists.` });
      }

      const deptDoc = await Department.findOne({ code: cleanDept });

      createdDoc = await Course.create({
        courseCode: cleanCode,
        courseName: String(payload.courseName).trim(),
        departmentCode: cleanDept,
        departmentRef: deptDoc?._id || null,
        credits: parseFloat(payload.credits) || 3.0,
        courseType: payload.courseType || 'Theory',
        semesterLevel: payload.semesterLevel || '',
        status: payload.status || 'active',
        description: payload.description ? String(payload.description).trim() : ''
      });

    } else if (entity === 'faculties') {
      const cleanCode = String(payload.code).trim().toUpperCase();
      const exists = await Faculty.findOne({ code: cleanCode });
      if (exists) {
        return res.status(400).json({ success: false, message: `Faculty Code '${cleanCode}' already exists.` });
      }

      createdDoc = await Faculty.create({
        code: cleanCode,
        name: String(payload.name).trim(),
        deanName: payload.deanName ? String(payload.deanName).trim() : '',
        description: payload.description ? String(payload.description).trim() : ''
      });

    } else if (entity === 'departments') {
      const cleanCode = String(payload.code).trim().toUpperCase();
      const exists = await Department.findOne({ code: cleanCode });
      if (exists) {
        return res.status(400).json({ success: false, message: `Department Code '${cleanCode}' already exists.` });
      }

      createdDoc = await Department.create({
        code: cleanCode,
        name: String(payload.name).trim(),
        faculty: payload.faculty || null,
        headName: payload.headName ? String(payload.headName).trim() : '',
        status: payload.status || 'active',
        description: payload.description ? String(payload.description).trim() : ''
      });

    } else if (entity === 'sessions') {
      const cleanName = String(payload.name).trim();
      const exists = await AcademicSession.findOne({ name: cleanName });
      if (exists) {
        return res.status(400).json({ success: false, message: `Academic Session '${cleanName}' already exists.` });
      }

      if (payload.isCurrent === true || payload.isCurrent === 'true') {
        await AcademicSession.updateMany({}, { isCurrent: false });
      }

      createdDoc = await AcademicSession.create({
        name: cleanName,
        year: parseInt(payload.year, 10) || new Date().getFullYear(),
        isCurrent: payload.isCurrent === true || payload.isCurrent === 'true',
        status: payload.status || 'ACTIVE'
      });

    } else if (entity === 'series') {
      const cleanName = String(payload.name).trim();
      const cleanDept = String(payload.departmentCode).trim().toUpperCase();

      const deptDoc = await Department.findOne({ code: cleanDept });
      if (!deptDoc) {
        return res.status(400).json({ success: false, message: `Department '${cleanDept}' not found.` });
      }

      const exists = await Series.findOne({ name: cleanName, department: deptDoc._id });
      if (exists) {
        return res.status(400).json({ success: false, message: `Series '${cleanName}' already exists in ${cleanDept}.` });
      }

      let sessionRef = null;
      if (payload.academicSession) {
        const sessDoc = await AcademicSession.findOne({
          $or: [
            { name: String(payload.academicSession).trim() },
            ...(mongoose.Types.ObjectId.isValid(payload.academicSession) ? [{ _id: payload.academicSession }] : [])
          ]
        });
        sessionRef = sessDoc?._id || null;
      }

      createdDoc = await Series.create({
        name: cleanName,
        department: deptDoc._id,
        departmentCode: deptDoc.code,
        academicSession: sessionRef,
        currentSemester: payload.currentSemester || '1st Semester',
        status: payload.status || 'active'
      });

    } else if (entity === 'course_offerings') {
      const courseId = payload.course;
      const courseDoc = await Course.findById(courseId);
      if (!courseDoc) {
        return res.status(400).json({ success: false, message: 'Selected course not found.' });
      }

      const cleanDept = String(payload.departmentCode || courseDoc.departmentCode).trim().toUpperCase();
      const cleanSeries = String(payload.seriesName).trim();
      const cleanSession = String(payload.sessionName).trim();
      const cleanSemester = String(payload.semesterName || '1st Semester').trim();

      const [deptDoc, seriesDoc, sessionDoc] = await Promise.all([
        Department.findOne({ code: cleanDept }),
        Series.findOne({ name: cleanSeries, departmentCode: cleanDept }),
        AcademicSession.findOne({ name: cleanSession })
      ]);

      createdDoc = await CourseOffering.create({
        course: courseDoc._id,
        courseCode: courseDoc.courseCode,
        courseName: courseDoc.courseName,
        courseType: courseDoc.courseType,
        credits: courseDoc.credits,
        department: deptDoc?._id || null,
        departmentCode: cleanDept,
        series: seriesDoc?._id || null,
        seriesName: cleanSeries,
        academicSession: sessionDoc?._id || null,
        sessionName: cleanSession,
        semesterName: cleanSemester,
        status: payload.status || 'active'
      });

    } else {
      createdDoc = await config.model.create(payload);
    }

    // 3. Write immutable audit log
    await AuditLog.create({
      userId: req.user._id,
      userRole: req.user.role || 'admin',
      userName: req.user.name || 'System Administrator',
      action: 'DATABASE_RECORD_CREATED',
      entity: config.modelName,
      entityId: String(createdDoc._id),
      details: `Created new ${config.label} record (${createdDoc._id})`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(e => console.error('AuditLog error:', e.message));

    res.status(201).json({
      success: true,
      message: `${config.label} record created successfully`,
      record: createdDoc
    });
  } catch (error) {
    console.error('createEntityRecord error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEntitiesOverview,
  getEntityRecords,
  getEntityRecordById,
  getEntityDependencies,
  getEntitySchema,
  createEntityRecord,
  updateEntityRecord,
  deleteEntityRecord
};
