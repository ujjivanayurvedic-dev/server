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

// ---------- Middlewares ----------
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://king-frontend-mu.vercel.app",
  "https://new-king-six.vercel.app"
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-scrape-secret" // ✅ REQUIRED FOR CRON
    ],
  })
);

// ---------- Routes ----------
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));
app.use("/api/setup-admin", admin);
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/date-number", require("./routes/dateNumber.routes"));
app.use("/api/v1", scraperRoutes);
app.use("/api", gameChartRoutes);

// ---------- Health ----------
app.get("/", (req, res) => {
  res.json({
    status: "API running",
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
