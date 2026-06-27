const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const requireAdmin = require("../middleware/auth");

const router = express.Router();

// Files are kept in memory (never written to local disk) because Render's
// filesystem is ephemeral — anything saved to disk disappears on the next
// deploy or restart. We stream the buffer straight to Cloudinary instead.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

// POST /api/upload - admin only, expects multipart/form-data with field "image"
router.post(
  "/",
  requireAdmin,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || "Upload error." });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file received." });
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "mandisa-nailed-it/products" },
          (err, uploaded) => (err ? reject(err) : resolve(uploaded))
        );
        stream.end(req.file.buffer);
      });

      res.json({ url: result.secure_url });
    } catch (err) {
      res.status(500).json({ message: "Image upload failed.", error: err.message });
    }
  }
);

module.exports = router;