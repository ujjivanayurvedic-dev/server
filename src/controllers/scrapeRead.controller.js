const ScrapeResult = require("../models/scrapeResult.model");

exports.getScrapeResults = async (req, res) => {
  try {
    const { gameId, date, limit = 100 } = req.query;

    const filter = {};
    if (gameId) filter.gameId = gameId;
    if (date) filter.date = date;

    // 🔥 FIX: Browser caching disabled
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '-1');
    res.set('Pragma', 'no-cache');

    const data = await ScrapeResult.find(filter)
      .sort({ isoDate: -1 }) // Optimized Sort
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      totalFound: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};