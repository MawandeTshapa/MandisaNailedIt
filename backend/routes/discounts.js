const express = require("express");
const Discount = require("../models/Discount");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

// All discount management is admin-only - the public never browses discounts
// directly, they just see already-discounted prices on services/products.

// GET /api/discounts - admin, all discounts (past, live, upcoming)
router.get("/", requireAdmin, async (req, res) => {
  const discounts = await Discount.find().sort({ startDate: -1 });
  res.json(discounts);
});

// POST /api/discounts - admin create
router.post("/", requireAdmin, async (req, res) => {
  try {
    const discount = await Discount.create(req.body);
    res.status(201).json(discount);
  } catch (err) {
    res.status(400).json({ message: "Could not create discount.", error: err.message });
  }
});

// PUT /api/discounts/:id - admin update
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!discount) return res.status(404).json({ message: "Discount not found." });
    res.json(discount);
  } catch (err) {
    res.status(400).json({ message: "Could not update discount.", error: err.message });
  }
});

// DELETE /api/discounts/:id - admin delete
router.delete("/:id", requireAdmin, async (req, res) => {
  const discount = await Discount.findByIdAndDelete(req.params.id);
  if (!discount) return res.status(404).json({ message: "Discount not found." });
  res.json({ message: "Discount deleted." });
});

module.exports = router;
