const service = require("./notification.service");

exports.getMine = async (req, res) => {
    try { return res.json({ success: true, data: await service.getMyNotifications(req.user.userId, req.query.limit) }); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};
exports.markRead = async (req, res) => {
    try { return res.json({ success: true, data: await service.markRead(req.params.id, req.user.userId) }); }
    catch (error) { return res.status(404).json({ success: false, message: error.message }); }
};
exports.markAllRead = async (req, res) => {
    try { await service.markAllRead(req.user.userId); return res.json({ success: true, message: "Notifications marked as read." }); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};
exports.deleteMine = async (req, res) => {
    try { await service.deleteNotification(req.params.id, req.user.userId); return res.json({ success: true, message: "Notification deleted." }); }
    catch (error) { return res.status(404).json({ success: false, message: error.message }); }
};
