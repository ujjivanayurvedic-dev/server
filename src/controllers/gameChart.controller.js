const ScrapeResult = require("../models/scrapeResult.model");
const DateNumber = require("../models/dateNumber.model");

// ============================================================================
// 🟢 HELPER: Indian Standard Time (IST) Date Calculator
// ============================================================================
const getIndianDates = () => {
  const now = new Date();
  // Add 5.5 hours to UTC to get IST
  const istOffset = 5.5 * 60 * 60 * 1000; 
  const istDate = new Date(now.getTime() + istOffset);
  
  const formatDate = (d) => {
    return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
  };

  const todayStr = formatDate(istDate);
  
  // Calculate Yesterday
  const yestDate = new Date(istDate);
  yestDate.setUTCDate(istDate.getUTCDate() - 1);
  const yesterdayStr = formatDate(yestDate);

  return { todayStr, yesterdayStr };
};

// ============================================================================
// 1️⃣ GET FULL CHART (OPTIMIZED WITH PAGINATION)
// ============================================================================
exports.getFullChart = async (req, res) => {
  try {
    const { page = 1, limit = 50, month, year } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build date filter if month/year specified
    const dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter.isoDate = { $gte: startDate, $lte: endDate };
    }

    // Cache Control: Public cache for 30s
    res.set('Cache-Control', 'public, max-age=30');

    // 1. Count total documents first
    const [totalScrape, totalNoida] = await Promise.all([
      ScrapeResult.countDocuments(dateFilter),
      DateNumber.countDocuments(dateFilter)
    ]);

    // 2. Fetch paginated data with projection
    const [scrapeData, noidaData] = await Promise.all([
      ScrapeResult.find(dateFilter, "gameId date resultNumber isoDate")
        .sort({ isoDate: -1 }) // Newest first for pagination
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DateNumber.find(dateFilter, "date number isoDate")
        .sort({ isoDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    const GAME_MAP = {
      "116": "DESAWAR",
      "127": "SHRI GANESH",
      "126": "DELHI BAZAR",
      "120": "GALI",
      "119": "GHAZIABAD",
      "117": "FARIDABAD",
    };

    // 3. Efficient Map for grouping
    const dateMap = new Map();

    // Process Scrape Data
    scrapeData.forEach(({ gameId, date, resultNumber, isoDate }) => {
      const name = GAME_MAP[gameId];
      if (!name || !date) return;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { 
          date, 
          isoDate: isoDate?.getTime() || 0,
          games: {} 
        });
      }
      dateMap.get(date).games[name] = { result: String(resultNumber) };
    });

    // Process Noida Data
    noidaData.forEach(({ date, number, isoDate }) => {
      if (!date) return;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { 
          date, 
          isoDate: isoDate?.getTime() || 0,
          games: {} 
        });
      }
      dateMap.get(date).games["NOIDA KING"] = { result: String(number) };
    });

    // 4. Convert to array and sort
    const rows = Array.from(dateMap.values())
      .sort((a, b) => b.isoDate - a.isoDate); // Descending (newest first)

    res.json({ 
      success: true, 
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Math.max(totalScrape, totalNoida),
        totalPages: Math.ceil(Math.max(totalScrape, totalNoida) / limitNum)
      }
    });

  } catch (err) {
    console.error("Full Chart Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// 2️⃣ GET LIVE CARDS (Optimized with single query)
// ============================================================================
exports.getTwoDayLive = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, max-age=0');
    const { todayStr, yesterdayStr } = getIndianDates();

    const GAME_MAP = {
      "116": "DESAWAR",
      "127": "SHRI GANESH",
      "126": "DELHI BAZAR",
      "120": "GALI",
      "119": "GHAZIABAD",
      "117": "FARIDABAD",
    };

    // 1. Fetch results for both days
    const [scrapeResults, noidaResults] = await Promise.all([
      ScrapeResult.find({ date: { $in: [todayStr, yesterdayStr] } }).lean(),
      DateNumber.find({ date: { $in: [todayStr, yesterdayStr] } }).lean()
    ]);

    // 2. Helper to format time to IST (HH:MM AM/PM)
    const formatISTTime = (date) => {
      if (!date) return null;
      return new Date(date).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    // 3. Helper to build the daily object
    const buildDayObject = (targetDate) => {
      const dayData = { date: targetDate, games: {} };

      // Process Scraped Games
      scrapeResults
        .filter(item => item.date === targetDate)
        .forEach(item => {
          const gameName = GAME_MAP[item.gameId];
          if (gameName) {
            dayData.games[gameName] = { 
              result: String(item.resultNumber),
              time: formatISTTime(item.createdAt) // Added Time
            };
          }
        });

      // Process Noida King
      const noidaEntry = noidaResults.find(item => item.date === targetDate);
      if (noidaEntry) {
        dayData.games["NOIDA KING"] = { 
          result: String(noidaEntry.number),
          time: formatISTTime(noidaEntry.createdAt) // Added Time
        };
      }

      return dayData;
    };

    const todayObj = buildDayObject(todayStr);
    const yesterdayObj = buildDayObject(yesterdayStr);

    res.json({
      success: true,
      hasTodayData: Object.keys(todayObj.games).length > 0,
      data: [todayObj, yesterdayObj]
    });

  } catch (err) {
    console.error("Live Card Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// 3️⃣ GET RECENT WIDGET (Optimized with single aggregation)
// ============================================================================
exports.getTopRecent = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store'); 
    
    const { todayStr } = getIndianDates();
    const now = Date.now();
    const threeHoursAgo = now - (3 * 60 * 60 * 1000);

    // Single aggregation for scrape results
    const scrapeAggregation = await ScrapeResult.aggregate([
      { 
        $match: { 
          date: todayStr,
          createdAt: { $gte: new Date(threeHoursAgo) }
        } 
      },
      { 
        $sort: { createdAt: -1 } 
      },
      { 
        $limit: 7 
      },
      {
        $project: {
          name: {
            $switch: {
              branches: [
                { case: { $eq: ["$gameId", "116"] }, then: "DESAWAR" },
                { case: { $eq: ["$gameId", "127"] }, then: "SHRI GANESH" },
                { case: { $eq: ["$gameId", "126"] }, then: "DELHI BAZAR" },
                { case: { $eq: ["$gameId", "120"] }, then: "GALI" },
                { case: { $eq: ["$gameId", "119"] }, then: "GHAZIABAD" },
                { case: { $eq: ["$gameId", "117"] }, then: "FARIDABAD" },
              ],
              default: null
            }
          },
          result: "$resultNumber",
          timestamp: { $toLong: "$createdAt" }
        }
      },
      {
        $match: {
          name: { $ne: null }
        }
      }
    ]);

    // Get noida data
    const noidaData = await DateNumber.findOne({ 
      date: todayStr,
      createdAt: { $gte: new Date(threeHoursAgo) }
    }).sort({ createdAt: -1 });

    // Combine and sort
    const allResults = [...scrapeAggregation];
    if (noidaData) {
      allResults.push({
        name: "NOIDA KING",
        result: String(noidaData.number),
        timestamp: noidaData.createdAt.getTime()
      });
    }

    // Sort and take top 3
    allResults.sort((a, b) => b.timestamp - a.timestamp);
    const topThree = allResults.slice(0, 3);

    // Format response
    const gamesObject = {};
    topThree.forEach(item => {
      gamesObject[item.name] = { 
        result: item.result, 
        timestamp: item.timestamp 
      };
    });

    res.json({ 
      success: true, 
      data: [{
        date: todayStr,
        games: gamesObject
      }] 
    });

  } catch (err) {
    console.error("Recent Widget Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};