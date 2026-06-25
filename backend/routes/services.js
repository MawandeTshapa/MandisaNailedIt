const express = require("express");
const Service = require("../models/Service");
const Discount = require("../models/Discount");
const requireAdmin = require("../middleware/auth");
const { getEffectivePrice } = require("../utils/pricing");

const router = express.Router();

// GET /api/services - public, active only, with live discount pricing applied
router.get("/", async (req, res) => {
  try {
    const services = await Service.find({ active: true }).sort({ category: 1, name: 1 });
    const discounts = await Discount.find({ active: true });

    const withPricing = services.map((s) => {
      const pricing = getEffectivePrice(s, discounts, "Service");
      return { ...s.toObject(), ...pricing };
    });

    res.json(withPricing);
  } catch (err) {
    res.status(500).json({ message: "Could not load services.", error: err.message });
  }
});

// GET /api/services/all - admin, includes inactive, no pricing math needed
router.get("/all", requireAdmin, async (req, res) => {
  const services = await Service.find().sort({ category: 1, name: 1 });
  res.json(services);
});

// POST /api/services - admin create
router.post("/", requireAdmin, async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ message: "Could not create service.", error: err.message });
  }
});

// PUT /api/services/:id - admin update
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json(service);
  } catch (err) {
    res.status(400).json({ message: "Could not update service.", error: err.message });
  }
});

// DELETE /api/services/:id - admin delete
router.delete("/:id", requireAdmin, async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) return res.status(404).json({ message: "Service not found." });
  res.json({ message: "Service deleted." });
});

module.exports = router;
