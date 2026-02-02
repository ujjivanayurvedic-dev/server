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
// 1️⃣ GET FULL CHART (For the Big Monthly Table)
// Logic: Fetches entire history so the table can show past months/years.
// ============================================================================
exports.getFullChart = async (req, res) => {
  try {
    // Cache Control: Public cache for 30s (Table doesn't change every second)
    res.set('Cache-Control', 'public, max-age=30, must-revalidate');

    // 1. Fetch ALL data (Sorted by Date)
    const [scrapeData, noidaData] = await Promise.all([
      ScrapeResult.find({}, "gameId date resultNumber isoDate createdAt")
        .sort({ isoDate: 1 })
        .lean(),
      DateNumber.find({}, "date number isoDate createdAt")
        .sort({ isoDate: 1 })
        .lean(),
    ]);

    const map = new Map();
    const GAME_MAP = {
      "116": "DESAWAR",
      "127": "SHRI GANESH",
      "126": "DELHI BAZAR",
      "120": "GALI",
      "119": "GHAZIABAD",
      "117": "FARIDABAD",
    };

    // Helper to initialize row
    const getOrCreateRow = (date, isoDate) => {
      if (!map.has(date)) {
        map.set(date, { 
          date, 
          timestamp: isoDate ? new Date(isoDate).getTime() : 0, 
          games: {} 
        });
      }
      return map.get(date);
    };

    // 2. Process Scrape Data
    scrapeData.forEach(({ gameId, date, resultNumber, createdAt, isoDate }) => {
      const name = GAME_MAP[gameId];
      if (name && date) {
        const row = getOrCreateRow(date, isoDate);
        row.games[name] = { 
          result: String(resultNumber), 
          createdAt 
        };
      }
    });

    // 3. Process Noida Data
    noidaData.forEach(({ date, number, createdAt, isoDate }) => {
      if (date) {
        const row = getOrCreateRow(date, isoDate);
        row.games["NOIDA KING"] = { 
          result: String(number), 
          createdAt 
        };
      }
    });

    // 4. Sort by Date & Clean Output
    const rows = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    const cleanedRows = rows.map(({ timestamp, ...rest }) => rest);

    res.json({ success: true, data: cleanedRows });

  } catch (err) {
    console.error("Full Chart Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// 2️⃣ GET LIVE CARDS (Only Yesterday & Today)
// Logic: Very fast, lightweight query for the dashboard cards.
// ============================================================================
exports.getTwoDayLive = async (req, res) => {
  try {
    // No Cache: Live results must update instantly
    res.set('Cache-Control', 'no-store, max-age=0');

    const { todayStr, yesterdayStr } = getIndianDates();
    const targetDates = [todayStr, yesterdayStr];

    // 1. Query only specific dates
    const [scrapeData, noidaData] = await Promise.all([
      ScrapeResult.find({ date: { $in: targetDates } }).lean(),
      DateNumber.find({ date: { $in: targetDates } }).lean()
    ]);

    const data = [];
    const map = new Map();
    const GAME_MAP = {
      "116": "DESAWAR",
      "127": "SHRI GANESH",
      "126": "DELHI BAZAR",
      "120": "GALI",
      "119": "GHAZIABAD",
      "117": "FARIDABAD",
    };

    const processItem = (date, gameName, result) => {
      if (!map.has(date)) {
        const entry = { date, games: {} };
        map.set(date, entry);
        data.push(entry);
      }
      map.get(date).games[gameName] = { result: String(result) };
    };

    scrapeData.forEach(item => {
      const name = GAME_MAP[item.gameId];
      if (name) processItem(item.date, name, item.resultNumber);
    });

    noidaData.forEach(item => {
      processItem(item.date, "NOIDA KING", item.number);
    });

    res.json({ success: true, data: data });

  } catch (err) {
    console.error("Live Card Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// 3️⃣ GET RECENT WIDGET (Top 3 Results of Today)
// Logic: Only Today's data, Sorted by time (Newest First).
// ============================================================================
exports.getTopRecent = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store'); 
    
    const { todayStr } = getIndianDates();

    // 1. Fetch ONLY Today's data
    const [scrapeData, noidaData] = await Promise.all([
      ScrapeResult.find({ date: todayStr }).lean(),
      DateNumber.find({ date: todayStr }).lean()
    ]);

    const results = [];
    const GAME_MAP = {
      "116": "DESAWAR",
      "127": "SHRI GANESH",
      "126": "DELHI BAZAR",
      "120": "GALI",
      "119": "GHAZIABAD",
      "117": "FARIDABAD",
    };

    // 2. Flatten data for sorting
    scrapeData.forEach(item => {
      if (GAME_MAP[item.gameId] && item.resultNumber) {
        results.push({
          name: GAME_MAP[item.gameId],
          result: String(item.resultNumber),
          timestamp: new Date(item.createdAt).getTime()
        });
      }
    });

    noidaData.forEach(item => {
      if (item.number) {
        results.push({
          name: "NOIDA KING",
          result: String(item.number),
          timestamp: new Date(item.createdAt).getTime()
        });
      }
    });

    // 3. Sort by Time (Newest First) & Slice Top 3
    results.sort((a, b) => b.timestamp - a.timestamp);
    const topThree = results.slice(0, 3);

    // 4. Format for Frontend
    const gamesObject = {};
    topThree.forEach(item => {
        gamesObject[item.name] = { 
            result: item.result, 
            timestamp: item.timestamp 
        };
    });

    // Return array with single "Today" object containing top 3 games
    const responseData = [{
        date: todayStr,
        games: gamesObject
    }];

    res.json({ success: true, data: responseData });

  } catch (err) {
    console.error("Recent Widget Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};