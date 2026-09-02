const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CloudTask Pro API is running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CloudTask Pro API running on port ${PORT}`);
});