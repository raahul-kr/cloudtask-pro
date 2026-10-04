const prisma = require("../lib/prisma");
const { recordActivity } = require("../utils/events");

async function createWorkspace(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Workspace name is required",
      });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: true,
      },
    });
    void recordActivity({ workspaceId: workspace.id, userId: req.user.id, action: "created a workspace", entityType: "WORKSPACE", entityId: workspace.id, changes: { name: workspace.name } });

    return res.status(201).json({
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.error("Create workspace error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getWorkspaces(req, res) {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: req.user.id,
          },
        },
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
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      workspaces,
    });
  } catch (error) {
    console.error("Get workspaces error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function getWorkspace(req, res) {
  try {
    const workspace = await prisma.workspace.findFirst({ where: { id: req.params.workspaceId, deletedAt: null }, include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      _count: { select: { projects: true } },
    } });
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: workspace.id, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this workspace" });
    return res.json({ workspace });
  } catch (error) {
    console.error("Get workspace error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function updateWorkspace(req, res) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) return res.status(400).json({ message: "Workspace name is required" });
    const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: req.params.workspaceId, userId: req.user.id } });
    if (!membership) return res.status(404).json({ message: "Workspace not found" });
    if (membership.role !== "OWNER") return res.status(403).json({ message: "Only the workspace owner can update it" });
    const workspace = await prisma.workspace.update({ where: { id: req.params.workspaceId }, data: { name } });
    void recordActivity({ workspaceId: workspace.id, userId: req.user.id, action: "updated a workspace", entityType: "WORKSPACE", entityId: workspace.id, changes: { name } });
    return res.json({ message: "Workspace updated successfully", workspace });
  } catch (error) {
    console.error("Update workspace error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteWorkspace(req, res) {
  try {
    const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: req.params.workspaceId, userId: req.user.id } });
    if (!membership) return res.status(404).json({ message: "Workspace not found" });
    if (membership.role !== "OWNER") return res.status(403).json({ message: "Only the workspace owner can delete it" });
    const deletedAt = new Date();
    await prisma.$transaction([
      prisma.workspace.update({ where: { id: req.params.workspaceId }, data: { deletedAt } }),
      prisma.project.updateMany({ where: { workspaceId: req.params.workspaceId, deletedAt: null }, data: { deletedAt } }),
      prisma.task.updateMany({ where: { project: { workspaceId: req.params.workspaceId }, deletedAt: null }, data: { deletedAt } }),
    ]);
    void recordActivity({ workspaceId: req.params.workspaceId, userId: req.user.id, action: "deleted a workspace", entityType: "WORKSPACE", entityId: req.params.workspaceId });
    return res.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("Delete workspace error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getMembers(req, res) {
  try {
    const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: req.params.workspaceId, userId: req.user.id, workspace: { deletedAt: null } } });
    if (!membership) return res.status(404).json({ message: "Workspace not found" });
    const members = await prisma.workspaceMember.findMany({ where: { workspaceId: req.params.workspaceId }, include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } });
    return res.json({ members });
  } catch (error) {
    console.error("Get workspace members error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function addMember(req, res) {
  try {
    const { userId, email } = req.body || {};
    const role = req.body?.role || "MEMBER";
    if ((!userId && !email) || !["ADMIN", "MEMBER"].includes(role)) return res.status(400).json({ message: "User ID or email and a valid member role are required" });
    const acting = await prisma.workspaceMember.findFirst({ where: { workspaceId: req.params.workspaceId, userId: req.user.id, workspace: { deletedAt: null } } });
    if (!acting) return res.status(404).json({ message: "Workspace not found" });
    if (!["OWNER", "ADMIN"].includes(acting.role)) return res.status(403).json({ message: "You cannot manage workspace members" });
    const target = await prisma.user.findFirst({ where: userId ? { id: userId, deletedAt: null } : { email: String(email).trim().toLowerCase(), deletedAt: null }, select: { id: true } });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (role === "ADMIN" && acting.role !== "OWNER") return res.status(403).json({ message: "Only the owner can assign the admin role" });
    const existing = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: target.id } } });
    if (existing) return res.status(409).json({ message: "User is already a workspace member" });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: req.params.workspaceId, userId: target.id, role }, include: { user: { select: { id: true, name: true, email: true } } } });
    return res.status(201).json({ message: "Workspace member added successfully", member });
  } catch (error) {
    console.error("Add workspace member error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function updateMember(req, res) {
  try {
    const role = req.body?.role;
    if (!["ADMIN", "MEMBER"].includes(role)) return res.status(400).json({ message: "A valid workspace role is required" });
    const acting = await prisma.workspaceMember.findFirst({ where: { workspaceId: req.params.workspaceId, userId: req.user.id } });
    if (!acting) return res.status(404).json({ message: "Workspace not found" });
    if (!["OWNER", "ADMIN"].includes(acting.role)) return res.status(403).json({ message: "You cannot manage workspace members" });
    if (role === "ADMIN" && acting.role !== "OWNER") return res.status(403).json({ message: "Only the owner can assign the admin role" });
    const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.params.userId } } });
    if (!target || target.role === "OWNER") return res.status(404).json({ message: "Workspace member not found" });
    if (acting.role === "ADMIN" && target.role !== "MEMBER") return res.status(403).json({ message: "Admins can only manage members" });
    const member = await prisma.workspaceMember.update({ where: { id: target.id }, data: { role }, include: { user: { select: { id: true, name: true, email: true } } } });
    return res.json({ message: "Workspace member updated successfully", member });
  } catch (error) {
    console.error("Update workspace member error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function removeMember(req, res) {
  try {
    const acting = await prisma.workspaceMember.findFirst({ where: { workspaceId: req.params.workspaceId, userId: req.user.id } });
    if (!acting) return res.status(404).json({ message: "Workspace not found" });
    if (!["OWNER", "ADMIN"].includes(acting.role)) return res.status(403).json({ message: "You cannot manage workspace members" });
    const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.params.userId } } });
    if (!target || target.role === "OWNER") return res.status(404).json({ message: "Workspace member not found" });
    if (acting.role === "ADMIN" && target.role !== "MEMBER") return res.status(403).json({ message: "Admins can only remove members" });
    await prisma.$transaction([
      prisma.workspaceMember.delete({ where: { id: target.id } }),
      prisma.projectMember.deleteMany({ where: { userId: target.userId, project: { workspaceId: req.params.workspaceId } } }),
    ]);
    return res.json({ message: "Workspace member removed successfully" });
  } catch (error) {
    console.error("Remove workspace member error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  addMember,
  updateMember,
  removeMember,
};
