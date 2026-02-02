const mongoose = require("mongoose");

const dateNumberSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      index: true, 
      match: /^\d{2}-\d{2}-\d{4}$/
    },
    // 🔥 Optimization: same strategy. Keep string, add real date for performance.
    isoDate: {
      type: Date,
      index: true
    },
    number: {
      type: Number,
      required: true,
      min: 0 // Basic integrity check
    },
  },
  { timestamps: true }
);

// Pre-save hook for efficient sorting data
dateNumberSchema.pre('save', function(next) {
  if (this.date && !this.isoDate) {
    const [day, month, year] = this.date.split('-');
    this.isoDate = new Date(year, month - 1, day);
  }
  next();
});

module.exports = mongoose.model("DateNumber", dateNumberSchema);