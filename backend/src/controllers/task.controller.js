const prisma = require("../lib/prisma");

async function createTask(req, res) {
  try {
    const {
      projectId,
      title,
      description,
      priority,
      dueDate,
    } = req.body;

    if (!projectId || !title || !title.trim()) {
      return res.status(400).json({
        message: "Project ID and task title are required",
      });
    }

    // Check whether the user belongs to the project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: req.user.id,
      },
    });

    if (!projectMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        creatorId: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getTasks(req, res) {
  try {
    const { projectId } = req.params;

    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: req.user.id,
      },
    });

    if (!projectMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            subtasks: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function updateTask(req, res) {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
    } = req.body;

    // Find the task
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

    // Check whether the user belongs to the project
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

    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        ...(title !== undefined && {
          title: title.trim(),
        }),

        ...(description !== undefined && {
          description: description?.trim() || null,
        }),

        ...(status !== undefined && {
          status,
        }),

        ...(priority !== undefined && {
          priority,
        }),

        ...(assigneeId !== undefined && {
          assigneeId,
        }),

        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
      },
    });

    return res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  createTask,
  getTasks,
  updateTask,
};