const prisma = require("../lib/prisma");
const { recordTaskActivity, notifyUser } = require("../utils/events");

async function createTask(req, res) {
  try {
    const {
      projectId,
      title,
      description,
      priority,
      dueDate,
      assigneeId,
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

    if (assigneeId) {
      const assigneeMember = await prisma.projectMember.findFirst({ where: { projectId, userId: assigneeId } });
      if (!assigneeMember) return res.status(400).json({ message: "Assignee must be a member of the project" });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        creatorId: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
      },
    });
    void recordTaskActivity({ taskId: task.id, userId: req.user.id, action: "created a task", changes: { title: task.title } });
    if (task.assigneeId && task.assigneeId !== req.user.id) void notifyUser({ userId: task.assigneeId, type: "TASK_ASSIGNED", title: "A task was assigned to you", message: `You were assigned “${task.title}”.` });

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
        project: { deletedAt: null, workspace: { deletedAt: null } },
      },
    });

    if (!projectMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    const allowedStatus = ["TODO", "IN_PROGRESS", "DONE"];
    const allowedPriority = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (req.query.status && !allowedStatus.includes(req.query.status)) return res.status(400).json({ message: "Invalid task status" });
    if (req.query.priority && !allowedPriority.includes(req.query.priority)) return res.status(400).json({ message: "Invalid task priority" });
    if (req.query.assigneeId && typeof req.query.assigneeId !== "string") return res.status(400).json({ message: "Invalid assignee ID" });
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(req.query.status && { status: req.query.status }),
        ...(req.query.priority && { priority: req.query.priority }),
        ...(req.query.assigneeId && { assigneeId: req.query.assigneeId }),
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
        project: { deletedAt: null, workspace: { deletedAt: null } },
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

    if (status !== undefined && !["TODO", "IN_PROGRESS", "DONE"].includes(status)) return res.status(400).json({ message: "Invalid task status" });
    if (priority !== undefined && !["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) return res.status(400).json({ message: "Invalid task priority" });
    if (title !== undefined && (typeof title !== "string" || !title.trim())) return res.status(400).json({ message: "Task title cannot be empty" });
    if (assigneeId) {
      const assigneeMember = await prisma.projectMember.findFirst({ where: { projectId: task.projectId, userId: assigneeId } });
      if (!assigneeMember) return res.status(400).json({ message: "Assignee must be a member of the project" });
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
    void recordTaskActivity({ taskId, userId: req.user.id, action: "updated a task", changes: { status, priority, title, assigneeId } });
    if (updatedTask.assigneeId && updatedTask.assigneeId !== task.assigneeId && updatedTask.assigneeId !== req.user.id) void notifyUser({ userId: updatedTask.assigneeId, type: "TASK_ASSIGNED", title: "A task was assigned to you", message: `You were assigned “${updatedTask.title}”.` });
    if (updatedTask.assigneeId && updatedTask.assigneeId !== req.user.id) void notifyUser({ userId: updatedTask.assigneeId, type: "TASK_UPDATED", title: "A task was updated", message: `“${updatedTask.title}” was updated.` });

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

async function deleteTask(req, res) {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.taskId, deletedAt: null, project: { deletedAt: null, workspace: { deletedAt: null } } }, select: { id: true, projectId: true } });
    if (!task) return res.status(404).json({ message: "Task not found" });
    const member = await prisma.projectMember.findFirst({ where: { projectId: task.projectId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this project" });
    if (member.role !== "MANAGER") {
      const workspaceRole = await prisma.workspaceMember.findFirst({ where: { workspaceId: (await prisma.project.findUnique({ where: { id: task.projectId }, select: { workspaceId: true } })).workspaceId, userId: req.user.id } });
      if (!workspaceRole || !["OWNER", "ADMIN"].includes(workspaceRole.role)) return res.status(403).json({ message: "You cannot delete this task" });
    }
    await prisma.task.update({ where: { id: task.id }, data: { deletedAt: new Date() } });
    void recordTaskActivity({ taskId: task.id, userId: req.user.id, action: "deleted a task" });
    return res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getTask(req, res) {
  try {
    const task = await prisma.task.findFirst({ where: { id: req.params.taskId, deletedAt: null, project: { deletedAt: null, workspace: { deletedAt: null } } }, include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      subtasks: { orderBy: { position: "asc" } },
    } });
    if (!task) return res.status(404).json({ message: "Task not found" });
    const member = await prisma.projectMember.findFirst({ where: { projectId: task.projectId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this project" });
    return res.json({ task });
  } catch (error) {
    console.error("Get task error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createTask,
  getTasks,
  updateTask,
  getTask,
  deleteTask,
};
