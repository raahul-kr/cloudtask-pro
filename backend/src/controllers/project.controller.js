const prisma = require("../lib/prisma");
const { recordActivity } = require("../utils/events");

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

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return res.status(403).json({ message: "Only workspace owners and admins can create projects" });
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
    void recordActivity({ workspaceId, projectId: project.id, userId: req.user.id, action: "created a project", entityType: "PROJECT", entityId: project.id, changes: { name: project.name } });

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

async function getProject(req, res) {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, deletedAt: null },
      include: { workspace: { select: { id: true, name: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!project) return res.status(404).json({ message: "Project not found" });
    const workspaceMember = await prisma.workspaceMember.findFirst({ where: { workspaceId: project.workspaceId, userId: req.user.id } });
    const member = await prisma.projectMember.findFirst({ where: { projectId: project.id, userId: req.user.id } });
    if (!workspaceMember || (!member && !["OWNER", "ADMIN"].includes(workspaceMember.role))) return res.status(403).json({ message: "You are not a member of this project" });
    return res.json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getProjectContext(projectId, userId) {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, include: { workspace: { select: { id: true, deletedAt: true } } } });
  if (!project || project.workspace.deletedAt) return { missing: true };
  const [projectMember, workspaceMember] = await Promise.all([
    prisma.projectMember.findFirst({ where: { projectId, userId } }),
    prisma.workspaceMember.findFirst({ where: { workspaceId: project.workspaceId, userId } }),
  ]);
  if (!workspaceMember || (!projectMember && !["OWNER", "ADMIN"].includes(workspaceMember.role))) return { forbidden: true };
  return { project, projectMember, workspaceMember };
}

function canManageProject(context) {
  return context.projectMember?.role === "MANAGER" || ["OWNER", "ADMIN"].includes(context.workspaceMember.role);
}

async function updateProject(req, res) {
  try {
    const context = await getProjectContext(req.params.projectId, req.user.id);
    if (!context.project) return res.status(context.missing ? 404 : 403).json({ message: context.missing ? "Project not found" : "You are not a member of this project" });
    if (!canManageProject(context)) return res.status(403).json({ message: "You cannot manage this project" });
    const { name, description } = req.body || {};
    if (name !== undefined && (typeof name !== "string" || !name.trim())) return res.status(400).json({ message: "Project name cannot be empty" });
    const project = await prisma.project.update({ where: { id: context.project.id }, data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: typeof description === "string" ? description.trim() || null : null }),
    } });
    void recordActivity({ workspaceId: project.workspaceId, projectId: project.id, userId: req.user.id, action: "updated a project", entityType: "PROJECT", entityId: project.id, changes: { name, description } });
    return res.json({ message: "Project updated successfully", project });
  } catch (error) {
    console.error("Update project error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteProject(req, res) {
  try {
    const context = await getProjectContext(req.params.projectId, req.user.id);
    if (!context.project) return res.status(context.missing ? 404 : 403).json({ message: context.missing ? "Project not found" : "You are not a member of this project" });
    if (!canManageProject(context)) return res.status(403).json({ message: "You cannot manage this project" });
    await prisma.project.update({ where: { id: context.project.id }, data: { deletedAt: new Date() } });
    void recordActivity({ workspaceId: context.project.workspaceId, projectId: context.project.id, userId: req.user.id, action: "deleted a project", entityType: "PROJECT", entityId: context.project.id });
    return res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getProjectMembers(req, res) {
  try {
    const context = await getProjectContext(req.params.projectId, req.user.id);
    if (!context.project) return res.status(context.missing ? 404 : 403).json({ message: context.missing ? "Project not found" : "You are not a member of this project" });
    const members = await prisma.projectMember.findMany({ where: { projectId: context.project.id }, include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } });
    return res.json({ members });
  } catch (error) {
    console.error("Get project members error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function addProjectMember(req, res) {
  try {
    const context = await getProjectContext(req.params.projectId, req.user.id);
    if (!context.project) return res.status(context.missing ? 404 : 403).json({ message: context.missing ? "Project not found" : "You are not a member of this project" });
    if (!canManageProject(context)) return res.status(403).json({ message: "You cannot manage project members" });
    const { userId } = req.body || {}; const role = req.body?.role || "MEMBER";
    if (typeof userId !== "string" || !["MANAGER", "MEMBER"].includes(role)) return res.status(400).json({ message: "User ID and a valid project role are required" });
    if (role === "MANAGER" && context.projectMember?.role !== "MANAGER" && context.workspaceMember.role !== "OWNER") return res.status(403).json({ message: "Only a project manager or workspace owner can assign managers" });
    const workspaceMember = await prisma.workspaceMember.findFirst({ where: { workspaceId: context.project.workspaceId, userId } });
    if (!workspaceMember) return res.status(400).json({ message: "User must belong to the workspace before joining the project" });
    const existing = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: context.project.id, userId } } });
    if (existing) return res.status(409).json({ message: "User is already a project member" });
    const member = await prisma.projectMember.create({ data: { projectId: context.project.id, userId, role }, include: { user: { select: { id: true, name: true, email: true } } } });
    return res.status(201).json({ message: "Project member added successfully", member });
  } catch (error) {
    console.error("Add project member error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function updateProjectMember(req, res) {
  try {
    const context = await getProjectContext(req.params.projectId, req.user.id);
    if (!context.project) return res.status(context.missing ? 404 : 403).json({ message: context.missing ? "Project not found" : "You are not a member of this project" });
    if (!canManageProject(context)) return res.status(403).json({ message: "You cannot manage project members" });
    const role = req.body?.role;
    if (!["MANAGER", "MEMBER"].includes(role)) return res.status(400).json({ message: "A valid project role is required" });
    if (role === "MANAGER" && context.projectMember.role !== "MANAGER" && context.workspaceMember.role !== "OWNER") return res.status(403).json({ message: "Only a project manager or workspace owner can assign managers" });
    const target = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: context.project.id, userId: req.params.userId } } });
    if (!target) return res.status(404).json({ message: "Project member not found" });
    const member = await prisma.projectMember.update({ where: { id: target.id }, data: { role }, include: { user: { select: { id: true, name: true, email: true } } } });
    return res.json({ message: "Project member updated successfully", member });
  } catch (error) {
    console.error("Update project member error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function removeProjectMember(req, res) {
  try {
    const context = await getProjectContext(req.params.projectId, req.user.id);
    if (!context.project) return res.status(context.missing ? 404 : 403).json({ message: context.missing ? "Project not found" : "You are not a member of this project" });
    if (!canManageProject(context)) return res.status(403).json({ message: "You cannot manage project members" });
    const target = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: context.project.id, userId: req.params.userId } } });
    if (!target) return res.status(404).json({ message: "Project member not found" });
    if (req.params.userId === req.user.id && target.role === "MANAGER") return res.status(400).json({ message: "A project manager cannot remove their own manager membership" });
    await prisma.projectMember.delete({ where: { id: target.id } });
    return res.json({ message: "Project member removed successfully" });
  } catch (error) {
    console.error("Remove project member error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
};
