require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");

// --------------------------------------------------
// Connect Database FIRST
// --------------------------------------------------
connectDB()
  .then(() => console.log("✅ Database connected"))
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  });

// --------------------------------------------------
// Create HTTP Server (best practice for prod)
// --------------------------------------------------
const server = http.createServer(app);

// --------------------------------------------------
// PORT
// --------------------------------------------------
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// Start Server
// --------------------------------------------------
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// --------------------------------------------------
// Graceful Shutdown (IMPORTANT for production)
// --------------------------------------------------
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("🧹 HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("🧹 HTTP server closed");
    process.exit(0);
  });
});
