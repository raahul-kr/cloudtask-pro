const prisma = require("../lib/prisma");

async function createProject(req, res) {
  try {
    const { workspaceId, name, description } = req.body;

    if (!workspaceId || !name || !name.trim()) {
      return res.status(400).json({
        message: "Workspace ID and project name are required",
      });
    }

    // Check whether the user belongs to the workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        members: {
          create: {
            userId: req.user.id,
            role: "MANAGER",
          },
        },
      },
      include: {
        members: true,
      },
    });

    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getProjects(req, res) {
  try {
    const { workspaceId } = req.params;

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

module.exports = {
  createProject,
  getProjects,
};