const axios = require("axios");
const ScrapeResult = require("../models/scrapeResult.model");

// ---------------- CORE SCRAPER ----------------
const performScrapingTask = async () => {
  console.log(`⏳ Scraping started: ${new Date().toLocaleString("en-IN")}`);

  try {
    const { data: html } = await axios.get("https://jksatta.com/", {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const recordMatch = html.match(/var\s+record\s*=\s*(\{.*?\});/s);
    if (!recordMatch) {
      throw new Error("Record object not found");
    }

    const record = JSON.parse(recordMatch[1]);
    const startYear = 2026;

    const bulkOps = [];
    const responseData = [];

    for (const gameId in record) {
      for (const dateKey in record[gameId]) {
        const entry = record[gameId][dateKey];
        const [day, month, yearStr] = entry.date.split("-");
        const year = Number(yearStr);

        if (year >= startYear) {
          const isoDate = new Date(year, month - 1, day);

          const payload = {
            gameId,
            date: entry.date,
            isoDate,
            resultNumber: entry.no,
          };

          responseData.push(payload);

          bulkOps.push({
            updateOne: {
              filter: { gameId, date: entry.date },
              update: { $set: payload },
              upsert: true,
            },
          });
        }
      }
    }

    if (bulkOps.length) {
      await ScrapeResult.bulkWrite(bulkOps, { ordered: false });
    }

    responseData.sort((a, b) => b.isoDate - a.isoDate);

    console.log(`✅ Scrape completed: ${responseData.length} records`);
    return { success: true, totalFound: responseData.length };

  } catch (error) {
    console.error("❌ Scrape failed:", error.message);
    return { success: false, message: error.message };
  }
};

// ---------------- API CONTROLLER ----------------
const scrapeJKSattaAllMonths = async (req, res) => {
  try {
    // 🔐 SECURITY CHECK
    const secret = req.headers["x-scrape-secret"];
    if (secret !== process.env.SCRAPE_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await performScrapingTask();

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { scrapeJKSattaAllMonths };
