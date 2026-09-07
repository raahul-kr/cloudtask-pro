const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");

const authRoutes = require("./routes/auth.routes");
const testRoutes = require("./routes/test.routes");

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CloudTask Pro API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CloudTask Pro API running on port ${PORT}`);
});