const Notification = require('../models/Notification');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const { unreadOnly, limit = 50 } = req.query;
        const query = { userId: req.user.id };
        if (unreadOnly === 'true') query.readAt = null;

        const notifications = await Notification.find(query)
            .populate('meta.taskId', 'title')
            .populate('meta.assignedTaskId', 'status deadline')
            .populate('meta.labId', 'name')
            .sort({ createdAt: -1 })
            .limit(Math.max(1, parseInt(limit, 10) || 50));

        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark one notification read
// @route   POST /api/notifications/:id/read
// @access  Private
exports.markRead = async (req, res) => {
    try {
        const notif = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        notif.readAt = new Date();
        await notif.save();

        res.status(200).json({ success: true, data: notif });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark all notifications read
// @route   POST /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, readAt: null },
            { $set: { readAt: new Date() } }
        );

        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Internal helper for other controllers
exports.createNotification = async ({ userId, title, message, type = 'system', meta = {} }) => {
    if (!userId) return null;
    const doc = await Notification.create({ userId, title, message, type, meta });
    return doc;
};
