const mongoose = require("mongoose");

const scrapeResultSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      // Removed standalone index; covered by compound index below
    },
    date: {
      type: String, // DD-MM-YYYY - Keeping logic as requested
      required: true,
    },
    // 🔥 Optimization: Store a real Date object for fast sorting/range queries later
    // This allows you to migrate logic slowly without breaking the UI today.
    isoDate: {
      type: Date,
      index: true
    },
    resultNumber: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// 🔥 COMPOUND INDEX OPTIMIZATION
// 1. Enforces uniqueness.
// 2. Optimizes queries like "Find results for Game X sorted by newest".
// 3. 'date: -1' is usually better for "latest" feeds.
scrapeResultSchema.index({ gameId: 1, date: -1 }, { unique: true });

// Pre-save hook to automatically populate efficient Date object
scrapeResultSchema.pre('save', function(next) {
  if (this.date && !this.isoDate) {
    const [day, month, year] = this.date.split('-');
    // Create Date object (Month is 0-indexed in JS)
    this.isoDate = new Date(year, month - 1, day);
  }
  next();
});

module.exports = mongoose.model("ScrapeResult", scrapeResultSchema);