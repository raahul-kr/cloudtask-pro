const prisma = require("../lib/prisma");

async function listNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 100 });
    return res.json({ notifications: notifications.map(({ readAt, ...item }) => ({ ...item, read: Boolean(readAt) })) });
  } catch (error) {
    console.error("List notifications error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function markRead(req, res) {
  try {
    const result = await prisma.notification.updateMany({ where: { id: req.params.notificationId, userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    if (!result.count) {
      const existing = await prisma.notification.findFirst({ where: { id: req.params.notificationId, userId: req.user.id } });
      if (!existing) return res.status(404).json({ message: "Notification not found" });
    }
    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function markAllRead(req, res) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } });
    return res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteNotification(req, res) {
  try {
    const result = await prisma.notification.deleteMany({ where: { id: req.params.notificationId, userId: req.user.id } });
    if (!result.count) return res.status(404).json({ message: "Notification not found" });
    return res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Delete notification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { listNotifications, markRead, markAllRead, deleteNotification };
