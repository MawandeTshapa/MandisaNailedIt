const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("-passwordHash");

    if (!admin) {
      return res.status(401).json({ message: "Admin account no longer exists." });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = requireAdmin;
