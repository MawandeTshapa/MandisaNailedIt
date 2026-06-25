const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Nails", "Lashes", "Hair Installation", "Hair Care", "Other"],
    },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 60, min: 0 },
    image: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
