const prisma = require("../lib/prisma");

async function recordActivity({ userId, workspaceId, projectId = null, taskId = null, action, entityType, entityId, changes = undefined }) {
  try {
    const safeChanges = changes && Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
    await prisma.activityLog.create({ data: { userId, workspaceId, projectId, taskId, action, entityType, entityId, ...(safeChanges && { changes: safeChanges }) } });
  } catch (error) {
    console.error("Activity log write failed:", error.message);
  }
}

async function recordTaskActivity({ taskId, userId, action, changes = undefined }) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true, project: { select: { workspaceId: true } } } });
    if (!task) return;
    const safeChanges = changes && Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
    return await recordActivity({ userId, workspaceId: task.project.workspaceId, projectId: task.projectId, taskId, action, entityType: "TASK", entityId: taskId, changes: safeChanges });
  } catch (error) {
    console.error("Task activity write failed:", error.message);
  }
}

async function notifyUser({ userId, type, title, message }) {
  try {
    if (userId) await prisma.notification.create({ data: { userId, type, title, message } });
  } catch (error) {
    console.error("Notification write failed:", error.message);
  }
}

module.exports = { recordActivity, recordTaskActivity, notifyUser };
