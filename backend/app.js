const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const serviceRoutes = require("./routes/services");
const productRoutes = require("./routes/products");
const discountRoutes = require("./routes/discounts");
const reviewRoutes = require("./routes/reviews");

// All API routes live on one router, mounted at whatever base path the
// caller needs (different on a normal server vs. inside a Netlify Function).
const apiRouter = express.Router();
apiRouter.use("/auth", authRoutes);
apiRouter.use("/services", serviceRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/discounts", discountRoutes);
apiRouter.use("/reviews", reviewRoutes);
apiRouter.get("/health", (req, res) => res.json({ status: "ok" }));

/**
 * @param {string} apiBasePath - where to mount the API router.
 *   "/api" for a traditional server (Render, Railway, a VPS, local dev).
 *   "/.netlify/functions/api" when running inside the Netlify Function —
 *   see netlify/functions/api.js and the root netlify.toml redirect.
 */
function createApp({ apiBasePath = "/api" } = {}) {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false })); // off so the embedded Google Map iframe loads
  app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
  app.use(express.json());

  app.use(apiBasePath, apiRouter);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Something went wrong on the server." });
  });

  return app;
}

module.exports = { createApp };
