const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      trim: true,
      default: "User" // Prevents UI null issues
    },
    email: {
      type: String,
      required: true, // Enforced at DB level
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { 
      type: String,
      required: true,
      select: false // 🔥 PERFORMANCE: Never return password by default. Reduces payload & risk.
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true // Useful if you have an admin dashboard filtering by role
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);