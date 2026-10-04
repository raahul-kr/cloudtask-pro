const prisma = require("../lib/prisma");
const { recordTaskActivity } = require("../utils/events");

async function createSubtask(req, res) {
  try {
    const { taskId, title } = req.body;

    if (!taskId || !title || !title.trim()) {
      return res.status(400).json({
        message: "Task ID and subtask title are required",
      });
    }

    // Find the parent task
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

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        title: title.trim(),
      },
    });
    void recordTaskActivity({ taskId, userId: req.user.id, action: "created a subtask", changes: { subtaskId: subtask.id, title: subtask.title } });

    return res.status(201).json({
      message: "Subtask created successfully",
      subtask,
    });
  } catch (error) {
    console.error("Create subtask error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getSubtasks(req, res) {
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

    const subtasks = await prisma.subtask.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      subtasks,
    });
  } catch (error) {
    console.error("Get subtasks error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function updateSubtask(req, res) {
  try {
    const subtask = await prisma.subtask.findUnique({
      where: { id: req.params.subtaskId },
      include: { task: { select: {
        projectId: true, deletedAt: true,
        project: { select: { deletedAt: true, workspace: { select: { deletedAt: true } } } },
      } } },
    });
    if (!subtask || subtask.task.deletedAt || subtask.task.project.deletedAt || subtask.task.project.workspace.deletedAt) return res.status(404).json({ message: "Subtask not found" });
    const member = await prisma.projectMember.findFirst({ where: { projectId: subtask.task.projectId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this project" });
    const { title, completed, position } = req.body || {};
    if (title !== undefined && (typeof title !== "string" || !title.trim())) return res.status(400).json({ message: "Subtask title cannot be empty" });
    if (completed !== undefined && typeof completed !== "boolean") return res.status(400).json({ message: "Completed must be a boolean" });
    if (position !== undefined && !Number.isFinite(Number(position))) return res.status(400).json({ message: "Position must be a number" });
    const updated = await prisma.subtask.update({ where: { id: subtask.id }, data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(completed !== undefined && { completed }),
      ...(position !== undefined && { position: Number(position) }),
    } });
    void recordTaskActivity({ taskId: subtask.taskId, userId: req.user.id, action: "updated a subtask", changes: { subtaskId: subtask.id, title, completed, position } });
    return res.json({ message: "Subtask updated successfully", subtask: updated });
  } catch (error) {
    console.error("Update subtask error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteSubtask(req, res) {
  try {
    const subtask = await prisma.subtask.findUnique({
      where: { id: req.params.subtaskId },
      include: { task: { select: {
        projectId: true, deletedAt: true,
        project: { select: { deletedAt: true, workspace: { select: { deletedAt: true } } } },
      } } },
    });
    if (!subtask || subtask.task.deletedAt || subtask.task.project.deletedAt || subtask.task.project.workspace.deletedAt) return res.status(404).json({ message: "Subtask not found" });
    const member = await prisma.projectMember.findFirst({ where: { projectId: subtask.task.projectId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this project" });
    await prisma.subtask.delete({ where: { id: subtask.id } });
    void recordTaskActivity({ taskId: subtask.taskId, userId: req.user.id, action: "deleted a subtask", changes: { subtaskId: subtask.id } });
    return res.json({ message: "Subtask deleted successfully" });
  } catch (error) {
    console.error("Delete subtask error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createSubtask,
  getSubtasks,
  updateSubtask,
  deleteSubtask,
};
