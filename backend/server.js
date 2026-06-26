// Entry point for traditional hosting: Render, Railway, a VPS, or local dev.
// Not used by Netlify — Netlify runs netlify/functions/api.js instead, and
// serves the frontend folder directly via its CDN. See netlify.toml.
require("dotenv").config();
const path = require("path");
const express = require("express");
const connectDB = require("./config/db");
const { createApp } = require("./app");
console.log("MONGO ENV:", process.env.MONGO_URL);

const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, "..", "frontend");

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("Could not start server — MongoDB connection failed:", err.message);
    process.exit(1);
  }

  const app = createApp({ apiBasePath: "/api" });

  // Serve the static frontend from the same server (one deploy, one URL).
  app.use(express.static(frontendPath));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(frontendPath, "index.html")));

  app.listen(PORT, () => console.log(`Mandisa Nailed It API running on port ${PORT}`));
}

start();
