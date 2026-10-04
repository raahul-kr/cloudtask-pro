const fs = require("fs/promises");
const path = require("path");
const prisma = require("../lib/prisma");
const { uploadDirectory } = require("../middleware/upload.middleware");

async function findAccessibleTask(taskId, userId) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null, project: { deletedAt: null } },
    select: { id: true, projectId: true },
  });
  if (!task) return { missing: true };
  const member = await prisma.projectMember.findFirst({
    where: { projectId: task.projectId, userId },
  });
  return member ? { task } : { forbidden: true };
}

async function createAttachment(req, res) {
  if (typeof req.body?.taskId !== "string" || !req.body.taskId.trim()) {
    return res.status(400).json({ message: "Task ID is required" });
  }
  if (!req.file) return res.status(400).json({ message: "A supported file is required" });
  try {
    const access = await findAccessibleTask(req.body.taskId, req.user.id);
    if (!access.task) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(access.missing ? 404 : 403).json({ message: access.missing ? "Task not found" : "You are not a member of this project" });
    }
    const attachment = await prisma.attachment.create({
      data: {
        taskId: access.task.id, userId: req.user.id,
        fileName: path.basename(req.file.originalname.replace(/\\/g, "/")).slice(0, 255),
        fileUrl: `/uploads/${req.file.filename}`, mimeType: req.file.mimetype, size: req.file.size,
      },
    });
    return res.status(201).json({ message: "Attachment uploaded successfully", attachment });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    console.error("Create attachment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getAttachments(req, res) {
  try {
    const access = await findAccessibleTask(req.params.taskId, req.user.id);
    if (!access.task) return res.status(access.missing ? 404 : 403).json({ message: access.missing ? "Task not found" : "You are not a member of this project" });
    const attachments = await prisma.attachment.findMany({
      where: { taskId: access.task.id, deletedAt: null }, orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return res.status(200).json({ attachments });
  } catch (error) {
    console.error("Get attachments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteAttachment(req, res) {
  try {
    const attachment = await prisma.attachment.findFirst({
      where: { id: req.params.attachmentId, deletedAt: null },
      include: { task: { select: { id: true, projectId: true, deletedAt: true } } },
    });
    if (!attachment || attachment.task.deletedAt) return res.status(404).json({ message: "Attachment not found" });
    const member = await prisma.projectMember.findFirst({ where: { projectId: attachment.task.projectId, userId: req.user.id } });
    if (!member) return res.status(403).json({ message: "You are not a member of this project" });
    await prisma.attachment.update({ where: { id: attachment.id }, data: { deletedAt: new Date() } });
    const filename = path.basename(attachment.fileUrl);
    await fs.unlink(path.join(uploadDirectory, filename)).catch(() => {});
    return res.status(200).json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { createAttachment, getAttachments, deleteAttachment };

