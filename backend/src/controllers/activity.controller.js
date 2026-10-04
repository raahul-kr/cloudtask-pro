const prisma = require("../lib/prisma");

async function getActivity(req, res) {
  try {
    const { workspaceId, projectId, taskId } = req.params;
    const task = taskId ? await prisma.task.findFirst({ where: { id: taskId, deletedAt: null }, select: { projectId: true, project: { select: { workspaceId: true } } } }) : null;
    if (taskId && !task) return res.status(404).json({ message: "Task not found" });
    const resolvedProjectId = projectId || task?.projectId;
    const resolvedWorkspaceId = workspaceId || task?.project.workspaceId;
    const member = resolvedProjectId
      ? await prisma.projectMember.findFirst({ where: { projectId: resolvedProjectId, userId: req.user.id } })
      : await prisma.workspaceMember.findFirst({ where: { workspaceId: resolvedWorkspaceId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You do not have access to this activity" });
    const where = taskId ? { taskId } : resolvedProjectId ? { projectId: resolvedProjectId } : { workspaceId: resolvedWorkspaceId };
    const activities = await prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { id: true, name: true, email: true } } } });
    return res.json({ activities });
  } catch (error) {
    console.error("Get activity error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { getActivity };
