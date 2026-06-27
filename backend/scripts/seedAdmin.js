// One-off script to create (or reset the password for) an Admin account.
// Run locally, pointed at the SAME MongoDB Atlas database your Render
// service uses, since Atlas is cloud-hosted and doesn't care where the
// script runs from.
//
// Usage:
//   node scripts/seedAdmin.js "Full Name" "email@example.com" "PlaintextPassword123"
//
// Place this file at: backend/scripts/seedAdmin.js
// Make sure backend/.env has the same MONGODB_URL as your Render service.

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");

async function main() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error('Usage: node scripts/seedAdmin.js "Full Name" "email@example.com" "Password123"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters (matches the reset-password rule).");
    process.exit(1);
  }

  await connectDB();

  let admin = await Admin.findOne({ email: email.toLowerCase() });

  if (admin) {
    console.log(`Admin with email ${email} already exists — updating their password instead.`);
    await admin.setPassword(password);
    await admin.save();
    console.log(`Password updated for ${admin.email}.`);
  } else {
    admin = new Admin({ name, email: email.toLowerCase() });
    await admin.setPassword(password);
    await admin.save();
    console.log(`Admin created: ${admin.email} (id: ${admin._id})`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed script failed:", err.message);
  process.exit(1);
});