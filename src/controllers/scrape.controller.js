const axios = require("axios");
const ScrapeResult = require("../models/scrapeResult.model");

// ---------------- CORE SCRAPER (OPTIMIZED) ----------------
const performScrapingTask = async () => {
  const startTime = Date.now();
  console.log(`⏳ Scraping started at ${new Date().toISOString()}`);

  try {
    const { data: html } = await axios.get("https://jksatta.com/", {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br"
      },
      timeout: 10000, // Reduced timeout
      maxContentLength: 1024 * 1024 * 5, // Limit to 5MB
    });

    const recordMatch = html.match(/var\s+record\s*=\s*(\{.*?\});/s);
    if (!recordMatch) {
      throw new Error("Record object not found");
    }

    const record = JSON.parse(recordMatch[1]);
    const startYear = 2026;
    const bulkOps = [];
    let processedCount = 0;
    const BATCH_SIZE = 1000;

    for (const gameId in record) {
      for (const dateKey in record[gameId]) {
        const entry = record[gameId][dateKey];
        const [day, month, yearStr] = entry.date.split("-");
        const year = Number(yearStr);

        if (year >= startYear) {
          const isoDate = new Date(year, month - 1, day);

          bulkOps.push({
            updateOne: {
              filter: { gameId, date: entry.date },
              update: { 
                $set: {
                  gameId,
                  date: entry.date,
                  isoDate,
                  resultNumber: entry.no
                } 
              },
              upsert: true,
            },
          });

          processedCount++;

          // Process in batches to avoid memory issues
          if (bulkOps.length >= BATCH_SIZE) {
            await ScrapeResult.bulkWrite(bulkOps, { ordered: false });
            bulkOps.length = 0; // Clear array efficiently
          }
        }
      }
    }

    // Process remaining operations
    if (bulkOps.length > 0) {
      await ScrapeResult.bulkWrite(bulkOps, { ordered: false });
    }

    console.log(
      `✅ Scrape completed | Records: ${processedCount} | Time: ${
        Date.now() - startTime
      }ms`
    );

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    return { success: true, totalRecords: processedCount };
  } catch (error) {
    console.error("❌ Scrape failed:", error.message);
    // Log full error for debugging
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data size:", 
        JSON.stringify(error.response.data).length);
    }
    return { success: false, message: error.message };
  }
};

// ---------------- API CONTROLLER ----------------
const scrapeJKSattaAllMonths = async (req, res) => {
  try {
    // 🔐 SECURITY
    const secret = req.headers["x-scrape-secret"];
    if (secret !== process.env.SCRAPE_SECRET) {
      console.warn("Unauthorized scrape attempt from IP:", req.ip);
      return res.status(401).send("Unauthorized");
    }

    // ✅ IMMEDIATE response for cron safety
    res.status(202).json({ 
      accepted: true, 
      message: "Scrape job started",
      timestamp: new Date().toISOString()
    });

    // ✅ Run scrape in background with error handling
    setImmediate(async () => {
      try {
        await performScrapingTask();
      } catch (error) {
        console.error("Background scrape error:", error);
        // You might want to log this to a monitoring service
      }
    });

  } catch (error) {
    console.error("Controller error:", error.message);
    // Don't send response if already sent
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
};

module.exports = { scrapeJKSattaAllMonths, performScrapingTask };