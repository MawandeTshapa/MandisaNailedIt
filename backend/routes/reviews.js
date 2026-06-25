const express = require("express");
const rateLimit = require("express-rate-limit");
const Review = require("../models/Review");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many reviews submitted. Please try again later." },
});

// GET /api/reviews - public, approved only
router.get("/", async (req, res) => {
  const reviews = await Review.find({ status: "approved" }).sort({ createdAt: -1 });
  res.json(reviews);
});

// POST /api/reviews - public submission, goes in as "pending" for moderation
router.post("/", submitLimiter, async (req, res) => {
  try {
    const { customerName, rating, comment } = req.body;
    if (!customerName || !rating || !comment) {
      return res.status(400).json({ message: "Name, rating, and comment are required." });
    }
    const review = await Review.create({ customerName, rating, comment, status: "pending" });
    res.status(201).json({ message: "Thank you! Your review will appear once approved.", review });
  } catch (err) {
    res.status(400).json({ message: "Could not submit review.", error: err.message });
  }
});

// GET /api/reviews/all - admin, every review regardless of status
router.get("/all", requireAdmin, async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 });
  res.json(reviews);
});

// PUT /api/reviews/:id/status - admin approve/reject
router.put("/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }
  const review = await Review.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!review) return res.status(404).json({ message: "Review not found." });
  res.json(review);
});

// DELETE /api/reviews/:id - admin delete
router.delete("/:id", requireAdmin, async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) return res.status(404).json({ message: "Review not found." });
  res.json({ message: "Review deleted." });
});

module.exports = router;
