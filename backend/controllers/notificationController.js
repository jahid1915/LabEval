const Notification = require('../models/Notification');

// @desc Get current user's notifications
// @route GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const user = req.user;
    const identifier = user.teacherId || user.rollNumber || user.username || '';

    const notifications = await Notification.find({
      $or: [
        { recipientRole: 'all' },
        { recipientRole: user.role },
        { recipientId: user._id },
        { recipientIdentifier: identifier }
      ]
    }).sort({ createdAt: -1 }).limit(30);

    const unreadCount = await Notification.countDocuments({
      isRead: false,
      $or: [
        { recipientRole: 'all' },
        { recipientRole: user.role },
        { recipientId: user._id },
        { recipientIdentifier: identifier }
      ]
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Mark single notification as read
// @route PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(notif);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Mark all as read
// @route POST /api/notifications/mark-all-read
const markAllRead = async (req, res) => {
  try {
    const user = req.user;
    const identifier = user.teacherId || user.rollNumber || user.username || '';

    await Notification.updateMany({
      isRead: false,
      $or: [
        { recipientRole: 'all' },
        { recipientRole: user.role },
        { recipientId: user._id },
        { recipientIdentifier: identifier }
      ]
    }, { isRead: true });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllRead
};
