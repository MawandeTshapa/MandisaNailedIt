const express = require("express");
const Product = require("../models/Product");
const Discount = require("../models/Discount");
const requireAdmin = require("../middleware/auth");
const { getEffectivePrice } = require("../utils/pricing");

const router = express.Router();

// GET /api/products - public, active only, with live discount pricing applied
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ category: 1, name: 1 });
    const discounts = await Discount.find({ active: true });

    const withPricing = products.map((p) => {
      const pricing = getEffectivePrice(p, discounts, "Product");
      return { ...p.toObject(), ...pricing };
    });

    res.json(withPricing);
  } catch (err) {
    res.status(500).json({ message: "Could not load products.", error: err.message });
  }
});

// GET /api/products/all - admin, includes inactive
router.get("/all", requireAdmin, async (req, res) => {
  const products = await Product.find().sort({ category: 1, name: 1 });
  res.json(products);
});

// POST /api/products - admin create
router.post("/", requireAdmin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: "Could not create product.", error: err.message });
  }
});

// PUT /api/products/:id - admin update
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found." });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: "Could not update product.", error: err.message });
  }
});

// DELETE /api/products/:id - admin delete
router.delete("/:id", requireAdmin, async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json({ message: "Product deleted." });
});

module.exports = router;
