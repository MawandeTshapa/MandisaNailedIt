require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./utils/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");

// Middleware
const protect = require("./middleware/authMiddleware");
const adminOnly = require("./middleware/adminMiddleware");

const app = express();

// Connect DB
connectDB();

// Global middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Mandisa Nailed It API is running...");
});

// Protected admin route
app.get("/api/admin-test", protect, adminOnly, (req, res) => {
  res.json({
    message: "Welcome Admin",
    user: req.user,
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});