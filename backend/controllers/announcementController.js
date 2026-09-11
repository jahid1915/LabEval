const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/auditMiddleware');

// @desc Get announcements based on logged-in user's role, department, series
// @route GET /api/announcements
const getAnnouncements = async (req, res) => {
  try {
    const user = req.user;
    let query = { status: 'active' };

    if (user && user.role === 'teacher') {
      query.$or = [
        { targetAudience: 'ALL' },
        { targetAudience: 'TEACHERS' },
        { targetDepartment: user.department },
        { targetAudience: 'FACULTY', targetFaculty: user.facultyRef }
      ];
    } else if (user && user.role === 'student') {
      query.$or = [
        { targetAudience: 'ALL' },
        { targetAudience: 'STUDENTS' },
        { targetDepartment: user.department },
        { targetSeries: user.series },
        { targetAudience: 'FACULTY', targetFaculty: user.facultyRef }
      ];
    }

    const announcements = await Announcement.find(query).sort({ isPinned: -1, createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create new announcement (Admin)
// @route POST /api/announcements
const createAnnouncement = async (req, res) => {
  try {
    const { title, message, targetAudience, targetDepartment, targetSeries, targetCourse, priority, isPinned, expirationDate } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      targetAudience: targetAudience || 'ALL',
      targetDepartment: targetDepartment ? targetDepartment.toUpperCase() : undefined,
      targetSeries: targetSeries || undefined,
      targetCourse: targetCourse || undefined,
      priority: priority || 'normal',
      isPinned: !!isPinned,
      expirationDate: expirationDate || null,
      createdBy: req.user._id,
      createdByName: req.user.name || req.user.username || 'Administration'
    });

    // Auto-create notification broadcast
    let recipientRole = 'all';
    if (targetAudience === 'TEACHERS') recipientRole = 'teacher';
    else if (targetAudience === 'STUDENTS') recipientRole = 'student';

    await Notification.create({
      recipientRole,
      title: `Announcement: ${announcement.title}`,
      message: announcement.message.substring(0, 120) + (announcement.message.length > 120 ? '...' : ''),
      type: 'announcement',
      linkUrl: '/announcements'
    });

    await logAudit({
      req,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: announcement._id,
      details: `Created announcement "${announcement.title}" for ${announcement.targetAudience}`,
      newValues: announcement
    });

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete announcement
// @route DELETE /api/announcements/:id
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    await announcement.deleteOne();

    await logAudit({
      req,
      action: 'DELETE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: req.params.id,
      details: `Deleted announcement "${announcement.title}"`
    });

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement
};
