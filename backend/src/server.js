const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");

const authRoutes = require("./routes/auth.routes");
const testRoutes = require("./routes/test.routes");

const workspaceRoutes = require("./routes/workspace.routes");

const projectRoutes = require("./routes/project.routes");

const taskRoutes = require("./routes/task.routes");

const subtaskRoutes = require("./routes/subtask.routes");

const commentRoutes = require("./routes/comment.routes");
const attachmentRoutes = require("./routes/attachment.routes");
const path = require("path");
const notificationRoutes = require("./routes/notification.routes");
const activityRoutes = require("./routes/activity.routes");

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), { dotfiles: "deny", index: false }));

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CloudTask Pro API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/subtasks", subtaskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CloudTask Pro API running on port ${PORT}`);
});
