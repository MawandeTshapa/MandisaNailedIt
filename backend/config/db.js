const mongoose = require("mongoose");

// Idempotent connect: safe to call on every request. On a traditional
// always-on server this only ever connects once. On Netlify Functions,
// warm invocations reuse the existing connection instead of opening a
// new one every time (mongoose.connection.readyState === 1 means "connected").
async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const conn = await mongoose.connect(process.env.MONGODB_URL, {
    // Keep a small pool — serverless functions run many short-lived
    // instances, so each one only needs a few connections, not the
    // default desktop-app-sized pool.
    maxPoolSize: 5,
  });
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn.connection;
}

module.exports = connectDB;
