const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets are not configured");
}

// Password hashing
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Password verification
async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

// Create short-lived access token
function generateAccessToken(userId) {
  return jwt.sign(
    { userId },
    ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
}

// Create long-lived refresh token
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
}

// Verify access token
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

// Verify refresh token
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};