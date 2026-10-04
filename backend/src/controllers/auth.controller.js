const crypto = require("crypto");
const prisma = require("../lib/prisma");
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/auth");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueTokens(userId) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);
  const decoded = verifyRefreshToken(refreshToken);
  await prisma.refreshToken.create({ data: { userId, tokenHash: hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000) } });
  return { accessToken, refreshToken };
}

async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const tokens = await issueTokens(user.id);

    return res.status(201).json({
      message: "Registration successful",
      user,
      ...tokens,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordValid = await comparePassword(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const tokens = await issueTokens(user.id);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (typeof refreshToken !== "string" || !refreshToken) return res.status(400).json({ message: "Refresh token is required" });
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash: hashToken(refreshToken), userId: decoded.userId, revokedAt: null, expiresAt: { gt: new Date() }, user: { deletedAt: null } } });
    if (!stored) return res.status(401).json({ message: "Invalid or revoked refresh token" });
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokens(decoded.userId);
    return res.json(tokens);
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}

async function logout(req, res) {
  const { refreshToken } = req.body || {};
  if (typeof refreshToken === "string" && refreshToken) {
    await prisma.refreshToken.updateMany({ where: { userId: req.user.id, tokenHash: hashToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  return res.json({ message: "Logged out successfully" });
}

async function me(req, res) {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id, deletedAt: null }, select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
};
