// Run once with: npm run seed
// Creates the initial admin login using values from .env, then exits.
require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env first.");
    process.exit(1);
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`Admin account already exists for ${email}. Nothing to do.`);
    process.exit(0);
  }

  const admin = new Admin({ name, email });
  await admin.setPassword(password);
  await admin.save();

  console.log(`Admin account created for ${email}. You can now log in at /admin.html`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
