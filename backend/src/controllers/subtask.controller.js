const prisma = require("../lib/prisma");

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

module.exports = {
  createSubtask,
  getSubtasks,
};