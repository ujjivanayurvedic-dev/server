const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUI = require("swagger-ui-express");
const compression = require("compression");
const helmet = require("helmet");
const swaggerSpec = require("./config/swagger");

const scraperRoutes = require("./routes/scraperRoutes");
const admin = require("./scripts/setUpAdmins");
const gameChartRoutes = require("./routes/gameChart.routes");

const app = express();

app.set("trust proxy", 1);

// ---------- Performance Middlewares ----------
app.use(helmet({
  contentSecurityPolicy: false, // Disable if you have custom CSP
  crossOriginEmbedderPolicy: false,
}));

// Advanced compression for production
app.use(compression({
  level: 6,
  threshold: 100 * 1024, // Only compress >100KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Body parser with size limits
app.use(express.json({ 
  limit: "100kb", // Reduced from 1mb
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(cookieParser());

// ---------- CORS ----------
const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://www.sattakingresult.info"
]);

// Update your CORS middleware in app.js
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Development: Allow all origins
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // Production: Only allow specific origins
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-scrape-secret',
      'x-no-compression',
      'Cache-Control',
      'Pragma',
      'Expires',
      'If-Modified-Since',
      'Accept',
      'Accept-Language',
      'Content-Language'
    ],
    exposedHeaders: [
      'Content-Length',
      'Content-Type',
      'Date',
      'ETag'
    ],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// ---------- Response Time Middleware ----------
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
});

// ---------- Routes ----------
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use("/api/setup-admin", admin);
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/date-number", require("./routes/dateNumber.routes"));
app.use("/api/v1", scraperRoutes);
app.use("/api", gameChartRoutes);

// ---------- Health Check ----------
app.get("/", (req, res) => {
  res.json({
    status: "API running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ---------- 404 Handler ----------
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  console.error("Global error:", err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

module.exports = app;