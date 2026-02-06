const ScrapeResult = require("../models/scrapeResult.model");

exports.getScrapeResults = async (req, res) => {
  try {
    const { 
      gameId, 
      date, 
      page = 1, 
      limit = 50,
      sortBy = "isoDate",
      sortOrder = -1 
    } = req.query;

    const filter = {};
    if (gameId) filter.gameId = gameId;
    if (date) filter.date = date;

    // Validate and parse inputs
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: parseInt(sortOrder) };

    // 🔥 Optimized Cache Control
    res.set({
      'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
      'Expires': new Date(Date.now() + 10000).toUTCString(),
      'Pragma': 'no-cache'
    });

    // Parallel execution for better performance
    const [data, total] = await Promise.all([
      ScrapeResult.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v') // Exclude version key
        .lean(),
      ScrapeResult.countDocuments(filter)
    ]);

    res.json({
      success: true,
      totalFound: total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data,
      hasMore: pageNum < Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error("Get Scrape Results Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};