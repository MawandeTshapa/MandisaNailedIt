const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash a plaintext password before saving if it was changed via setPassword()
adminSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

adminSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Generates a one-time reset token, stores only its hash, returns the raw token
// (the raw token is what gets emailed to the admin - never store it directly)
adminSchema.methods.createResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.resetTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  this.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  return rawToken;
};

module.exports = mongoose.model("Admin", adminSchema);
