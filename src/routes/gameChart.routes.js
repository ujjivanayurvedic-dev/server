const express = require('express');
const router = express.Router();
const gameChartController = require('../controllers/gameChart.controller'); // Make sure this path points to your new controller file

// ============================================================================
// 📊 GAME CHART ROUTES
// ============================================================================

// 1️⃣ Full Chart Route (For the Big Table)
// Fetches all history. Used in "GameResultsTable.js"
router.get('/game-chart-full', gameChartController.getFullChart);  // 30 ms

// 2️⃣ Live Cards Route (Yesterday & Today)
// Fetches only 2 days. Used in "LiveResultCards.js"
router.get('/game-chart-live', gameChartController.getTwoDayLive);  // 10 ms

// 3️⃣ Recent Widget Route (Top 3 Latest)
// Fetches only Today's top 3. Used in "RecentResultsWidget.js"
router.get('/game-chart-recent', gameChartController.getTopRecent);  // 5 ms

module.exports = router;