const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const Admin = require("../models/Admin");
const { sendPasswordResetEmail } = require("../utils/email");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

// Limit brute-force attempts on login + forgot-password
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Please try again later." },
});

function signToken(admin) {
  return jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });
}

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const valid = await admin.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = signToken(admin);
    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email: (email || "").toLowerCase() });

    // Always respond the same way whether or not the account exists,
    // so attackers can't use this endpoint to discover valid admin emails.
    const genericResponse = {
      message: "If that email is registered, a reset link has been sent.",
    };

    if (!admin) return res.json(genericResponse);

    const rawToken = admin.createResetToken();
    await admin.save();

    const resetUrl = `${process.env.CLIENT_URL}/admin.html?resetToken=${rawToken}`;
    await sendPasswordResetEmail(admin.email, resetUrl);

    res.json(genericResponse);
  } catch (err) {
    res.status(500).json({ message: "Could not process request.", error: err.message });
  }
});

// POST /api/auth/reset-password/:token
router.post("/reset-password/:token", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const admin = await Admin.findOne({
      resetTokenHash: tokenHash,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    await admin.setPassword(password);
    admin.resetTokenHash = null;
    admin.resetTokenExpiry = null;
    await admin.save();

    res.json({ message: "Password updated successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: "Could not reset password.", error: err.message });
  }
});

module.exports = router;
