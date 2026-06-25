const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true }, // e.g. "Winter Lash Special"
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 }, // 20 means 20% or R20 off depending on type

    // What this discount applies to
    scope: {
      type: String,
      enum: ["all", "services", "products", "item"],
      required: true,
      default: "all",
    },
    // Only used when scope === "item"
    targetModel: { type: String, enum: ["Service", "Product", null], default: null },
    targetId: { type: mongoose.Schema.Types.ObjectId, refPath: "targetModel", default: null },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Convenience: is this discount currently within its active window?
discountSchema.methods.isLive = function (now = new Date()) {
  return this.active && this.startDate <= now && this.endDate >= now;
};

module.exports = mongoose.model("Discount", discountSchema);
