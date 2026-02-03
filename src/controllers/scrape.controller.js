const axios = require("axios");
const ScrapeResult = require("../models/scrapeResult.model");

// ---------------- CORE SCRAPER ----------------
const performScrapingTask = async () => {
  const startTime = Date.now();
  console.log(`⏳ Scraping started at ${new Date().toISOString()}`);

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
    let totalRecords = 0;

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

          bulkOps.push({
            updateOne: {
              filter: { gameId, date: entry.date },
              update: { $set: payload },
              upsert: true,
            },
          });

          totalRecords++;
        }
      }
    }

    if (bulkOps.length) {
      await ScrapeResult.bulkWrite(bulkOps, { ordered: false });
    }

    console.log(
      `✅ Scrape completed | Records: ${totalRecords} | Time: ${
        Date.now() - startTime
      }ms`
    );

    return { success: true, totalRecords };
  } catch (error) {
    console.error("❌ Scrape failed:", error.message);
    return { success: false, message: error.message };
  }
};

// ---------------- API CONTROLLER ----------------
const scrapeJKSattaAllMonths = async (req, res) => {
  try {
    // 🔐 SECURITY
    const secret = req.headers["x-scrape-secret"];
    if (secret !== process.env.SCRAPE_SECRET) {
      return res.status(401).send("Unauthorized");
    }

    // ✅ Respond immediately (cron safe)
    res.status(200).send("SCRAPE STARTED");

    // ✅ Run scrape in background
    setImmediate(async () => {
      await performScrapingTask();
    });
  } catch (error) {
    console.error("Controller error:", error.message);
  }
};

module.exports = { scrapeJKSattaAllMonths };
