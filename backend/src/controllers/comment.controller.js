const prisma = require("../lib/prisma");
const { recordTaskActivity, notifyUser } = require("../utils/events");

async function createComment(req, res) {
  try {
    const { taskId, content } = req.body;

    if (!taskId || !content || !content.trim()) {
      return res.status(400).json({
        message: "Task ID and comment content are required",
      });
    }

    // Find the task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: { deletedAt: null, workspace: { deletedAt: null } },
        project: { deletedAt: null, workspace: { deletedAt: null } },
      },
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Check project membership
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId: req.user.id,
      },
    });

    if (!projectMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: req.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    void recordTaskActivity({ taskId, userId: req.user.id, action: "added a comment", changes: { commentId: comment.id } });
    const taskAssignee = await prisma.task.findUnique({ where: { id: taskId }, select: { assigneeId: true, title: true } });
    if (taskAssignee?.assigneeId && taskAssignee.assigneeId !== req.user.id) void notifyUser({ userId: taskAssignee.assigneeId, type: "COMMENT_ADDED", title: "New comment on your task", message: `${comment.user.name} commented on “${taskAssignee.title}”.` });

    return res.status(201).json({
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getComments(req, res) {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: { deletedAt: null, workspace: { deletedAt: null } },
      },
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    // Check project membership
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId: req.user.id,
      },
    });

    if (!projectMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const comments = await prisma.comment.findMany({
      where: {
        taskId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function updateComment(req, res) {
  try {
    const comment = await prisma.comment.findFirst({ where: { id: req.params.commentId, deletedAt: null }, include: { task: { select: { projectId: true, deletedAt: true, project: { select: { deletedAt: true, workspaceId: true, workspace: { select: { deletedAt: true } } } } } } } });
    if (!comment || comment.task.deletedAt || comment.task.project.deletedAt || comment.task.project.workspace.deletedAt) return res.status(404).json({ message: "Comment not found" });
    const member = await prisma.projectMember.findFirst({ where: { projectId: comment.task.projectId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this project" });
    if (comment.userId !== req.user.id) return res.status(403).json({ message: "You can only edit your own comments" });
    const content = req.body?.content;
    if (typeof content !== "string" || !content.trim()) return res.status(400).json({ message: "Comment content is required" });
    const updated = await prisma.comment.update({ where: { id: comment.id }, data: { content: content.trim() }, include: { user: { select: { id: true, name: true, email: true } } } });
    void recordTaskActivity({ taskId: comment.taskId, userId: req.user.id, action: "edited a comment", changes: { commentId: comment.id } });
    return res.json({ message: "Comment updated successfully", comment: updated });
  } catch (error) {
    console.error("Update comment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteComment(req, res) {
  try {
    const comment = await prisma.comment.findFirst({ where: { id: req.params.commentId, deletedAt: null }, include: { task: { select: { projectId: true, deletedAt: true, project: { select: { deletedAt: true, workspaceId: true, workspace: { select: { deletedAt: true } } } } } } } });
    if (!comment || comment.task.deletedAt || comment.task.project.deletedAt || comment.task.project.workspace.deletedAt) return res.status(404).json({ message: "Comment not found" });
    const member = await prisma.projectMember.findFirst({ where: { projectId: comment.task.projectId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this project" });
    if (comment.userId !== req.user.id && member.role !== "MANAGER") {
      const workspaceMember = await prisma.workspaceMember.findFirst({ where: { workspaceId: comment.task.project.workspaceId, userId: req.user.id } });
      if (!workspaceMember || !["OWNER", "ADMIN"].includes(workspaceMember.role)) return res.status(403).json({ message: "You cannot delete this comment" });
    }
    await prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
    void recordTaskActivity({ taskId: comment.taskId, userId: req.user.id, action: "deleted a comment", changes: { commentId: comment.id } });
    return res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
};
