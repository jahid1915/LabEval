const mongoose = require('mongoose');
const Project = require('../models/Project');
const SupervisionAssignment = require('../models/SupervisionAssignment');
const ProjectActivity = require('../models/ProjectActivity');
const ProjectMessage = require('../models/ProjectMessage');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { emitProjectUpdate } = require('../utils/socketManager');

// Helper to check user authorization on a project
const checkProjectAccess = async (projectId, req) => {
  const project = await Project.findById(projectId)
    .populate('primarySupervisor', 'name teacherId email designation')
    .populate('coSupervisor', 'name teacherId email designation')
    .populate('students.student', 'name rollNumber registrationNumber session series semester email')
    .lean();

  if (!project) return { authorized: false, project: null, reason: 'Project not found' };

  const user = req.user;
  if (!user) return { authorized: false, project: null, reason: 'Unauthenticated' };

  // Admin has global access
  if (user.role === 'admin') return { authorized: true, project, role: 'admin' };

  // Department Head has access to projects within their department
  if (user.role === 'department_head') {
    const deptCode = user.departmentCode || user.department;
    if (project.departmentCode === deptCode || String(project.department) === String(user.departmentRef || user.department)) {
      return { authorized: true, project, role: 'department_head' };
    }
    return { authorized: false, project: null, reason: 'Forbidden: Project belongs to another department' };
  }

  // Teacher has access if assigned as primary or co-supervisor
  if (user.role === 'teacher') {
    const tProfileId = String(user.profileRef || user._id);
    const primId = project.primarySupervisor?._id?.toString() || project.primarySupervisor?.toString();
    const coId = project.coSupervisor?._id?.toString() || project.coSupervisor?.toString();
    const uTeacherId = user.loginIdentifier?.toUpperCase();

    if (
      primId === tProfileId || coId === tProfileId ||
      project.primarySupervisorId?.toUpperCase() === uTeacherId ||
      project.coSupervisorId?.toUpperCase() === uTeacherId
    ) {
      return { authorized: true, project, role: 'supervisor' };
    }
    return { authorized: false, project: null, reason: 'Forbidden: You are not assigned to supervise this project' };
  }

  // Student has access if listed in project members
  if (user.role === 'student') {
    const sRoll = user.loginIdentifier?.toUpperCase();
    const sProfileId = String(user.profileRef || user._id);

    const isMember = project.students?.some(s => 
      s.rollNumber?.toUpperCase() === sRoll ||
      String(s.student?._id || s.student) === sProfileId
    );

    if (isMember) {
      return { authorized: true, project, role: 'member' };
    }
    return { authorized: false, project: null, reason: 'Forbidden: You are not a registered member of this project team' };
  }

  return { authorized: false, project: null, reason: 'Unauthorized access' };
};

// ── GET /api/projects/:projectId/workspace ───────────────────────────
const getProjectWorkspace = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { authorized, project, reason, role } = await checkProjectAccess(projectId, req);

    if (!authorized) {
      return res.status(403).json({ success: false, message: reason });
    }

    const [activities, messages] = await Promise.all([
      ProjectActivity.find({ project: projectId }).sort({ createdAt: -1 }).limit(30).lean(),
      ProjectMessage.find({ project: projectId }).sort({ createdAt: 1 }).limit(100).lean()
    ]);

    // Compute real progress analytics from actual milestones & activities
    const milestones = project.milestones || [];
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    // Time-series progress points based on milestone completion dates and creation
    const chartData = [];
    const startDate = new Date(project.createdAt);
    chartData.push({ stage: 'Initiation', progress: 0, date: startDate.toISOString().split('T')[0] });

    let runningCompleted = 0;
    const completedList = milestones.filter(m => m.status === 'completed' && m.completedAt).sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    
    completedList.forEach((m, idx) => {
      runningCompleted += 1;
      const pct = Math.round((runningCompleted / totalMilestones) * 100);
      chartData.push({
        stage: m.title.length > 15 ? m.title.slice(0, 15) + '...' : m.title,
        progress: pct,
        date: new Date(m.completedAt).toISOString().split('T')[0]
      });
    });

    if (chartData.length === 1) {
      chartData.push({ stage: 'Current', progress: progressPercent, date: new Date().toISOString().split('T')[0] });
    }

    res.json({
      success: true,
      userRoleInProject: role,
      project: {
        ...project,
        progress: progressPercent
      },
      stats: {
        totalMilestones,
        completedMilestones,
        progressPercent,
        teamSize: project.students?.length || 0,
        activityCount: activities.length
      },
      activities,
      messages,
      chartData
    });
  } catch (error) {
    console.error('getProjectWorkspace error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PUT /api/projects/:projectId/milestones/:milestoneId ─────────────
const updateMilestone = async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;
    const { status, title, description, dueDate } = req.body;

    const { authorized, project, reason } = await checkProjectAccess(projectId, req);
    if (!authorized) return res.status(403).json({ success: false, message: reason });

    const projDoc = await Project.findById(projectId);
    if (!projDoc) return res.status(404).json({ success: false, message: 'Project not found' });

    const milestone = projDoc.milestones.id(milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    if (status !== undefined) {
      milestone.status = status;
      if (status === 'completed') {
        milestone.completedAt = new Date();
        milestone.completedBy = req.user.name || 'Team Member';
      } else {
        milestone.completedAt = null;
        milestone.completedBy = '';
      }
    }
    if (title) milestone.title = title.trim();
    if (description !== undefined) milestone.description = description.trim();
    if (dueDate) milestone.dueDate = new Date(dueDate);

    // Recalculate progress
    const total = projDoc.milestones.length;
    const completed = projDoc.milestones.filter(m => m.status === 'completed').length;
    projDoc.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (projDoc.progress === 100) projDoc.status = 'completed';

    await projDoc.save();

    // Log Activity
    const activityDesc = status === 'completed'
      ? `${req.user.name} completed milestone: "${milestone.title}"`
      : `${req.user.name} updated milestone: "${milestone.title}" to ${status}`;

    const newActivity = await ProjectActivity.create({
      project: projectId,
      student: req.user.role === 'student' ? req.user.profileRef : null,
      studentRoll: req.user.rollNumber || req.user.loginIdentifier || '',
      studentName: req.user.name || 'User',
      activityType: status === 'completed' ? 'MILESTONE_COMPLETED' : 'GENERAL_UPDATE',
      description: activityDesc
    });

    emitProjectUpdate(projectId, 'project:milestoneUpdated', {
      milestone,
      progress: projDoc.progress,
      activity: newActivity
    });

    res.json({
      success: true,
      milestone,
      progress: projDoc.progress,
      activity: newActivity
    });
  } catch (error) {
    console.error('updateMilestone error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/projects/:projectId/milestones ─────────────────────────
const addMilestone = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Milestone title is required' });
    }

    const { authorized, project, reason } = await checkProjectAccess(projectId, req);
    if (!authorized) return res.status(403).json({ success: false, message: reason });

    const projDoc = await Project.findById(projectId);
    const newMilestone = {
      title: title.trim(),
      description: description?.trim() || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending'
    };

    projDoc.milestones.push(newMilestone);
    
    // Recalculate progress
    const total = projDoc.milestones.length;
    const completed = projDoc.milestones.filter(m => m.status === 'completed').length;
    projDoc.progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    await projDoc.save();

    const added = projDoc.milestones[projDoc.milestones.length - 1];

    const activity = await ProjectActivity.create({
      project: projectId,
      student: req.user.role === 'student' ? req.user.profileRef : null,
      studentRoll: req.user.rollNumber || req.user.loginIdentifier || '',
      studentName: req.user.name || 'User',
      activityType: 'GENERAL_UPDATE',
      description: `${req.user.name} added a new milestone: "${added.title}"`
    });

    emitProjectUpdate(projectId, 'project:milestoneCreated', {
      milestone: added,
      progress: projDoc.progress,
      activity
    });

    res.status(201).json({
      success: true,
      milestone: added,
      progress: projDoc.progress
    });
  } catch (error) {
    console.error('addMilestone error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/projects/:projectId/activities ─────────────────────────
const logProjectActivity = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { activityType = 'GENERAL_UPDATE', description, metadata = {} } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Activity description is required' });
    }

    const { authorized, reason } = await checkProjectAccess(projectId, req);
    if (!authorized) return res.status(403).json({ success: false, message: reason });

    const activity = await ProjectActivity.create({
      project: projectId,
      student: req.user.role === 'student' ? req.user.profileRef : null,
      studentRoll: req.user.rollNumber || req.user.loginIdentifier || '',
      studentName: req.user.name || 'User',
      activityType,
      description: description.trim(),
      metadata
    });

    emitProjectUpdate(projectId, 'project:activityCreated', { activity });

    res.status(201).json({ success: true, activity });
  } catch (error) {
    console.error('logProjectActivity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/projects/:projectId/messages ───────────────────────────
const postProjectMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const { authorized, reason } = await checkProjectAccess(projectId, req);
    if (!authorized) return res.status(403).json({ success: false, message: reason });

    const msgDoc = await ProjectMessage.create({
      project: projectId,
      sender: req.user._id,
      senderName: req.user.name || 'User',
      senderRole: req.user.role || 'student',
      senderRoll: req.user.rollNumber || req.user.loginIdentifier || '',
      message: message.trim()
    });

    emitProjectUpdate(projectId, 'project:messageReceived', { message: msgDoc });

    res.status(201).json({ success: true, message: msgDoc });
  } catch (error) {
    console.error('postProjectMessage error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProjectWorkspace,
  updateMilestone,
  addMilestone,
  logProjectActivity,
  postProjectMessage
};
