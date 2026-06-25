// This is the API once it's deployed on Netlify. Netlify turns this file
// into a serverless function (an AWS Lambda under the hood). The root
// netlify.toml redirects /api/* requests here, so the frontend's existing
// fetch calls to /api/... keep working unchanged.
require("dotenv").config();
const serverless = require("serverless-http");
const connectDB = require("../../config/db");
const { createApp } = require("../../app");

// Mounted at the literal path Netlify invokes this function on, so the
// Express router lines up with where the redirect actually sends requests.
const app = createApp({ apiBasePath: "/.netlify/functions/api" });
const serverlessHandler = serverless(app);

module.exports.handler = async (event, context) => {
  try {
    // Cheap no-op if already connected (warm invocation) — see config/db.js.
    await connectDB();
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Database connection failed.", error: err.message }),
    };
  }
  return serverlessHandler(event, context);
};
