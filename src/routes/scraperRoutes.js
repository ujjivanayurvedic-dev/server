const express = require("express");
const router = express.Router();

const { scrapeJKSattaAllMonths } = require("../controllers/scrape.controller");
const { getScrapeResults } = require("../controllers/scrapeRead.controller");

const cacheMedium = (req, res, next) => {
  res.set("Cache-Control", "public, max-age=60");
  next();
};

router.post("/scrape", scrapeJKSattaAllMonths); // ✅ POST

router.get("/results", cacheMedium, getScrapeResults);

module.exports = router;
