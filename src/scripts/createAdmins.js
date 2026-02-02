require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

const admins = [
  {
    name: "Admin One",
    email: "admin1@example.com",
    password: "Admin@123",
  },
  {
    name: "Admin Two",
    email: "admin2@example.com",
    password: "Admin@456",
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount >= 2) {
      console.log("❌ Admin limit reached (2 admins only)");
      process.exit(0);
    }

    for (const admin of admins) {
      const exists = await User.findOne({ email: admin.email });
      if (exists) {
        console.log(`⚠️ Already exists: ${admin.email}`);
        continue;
      }

      const hash = await bcrypt.hash(admin.password, 10);

      await User.create({
        name: admin.name,
        email: admin.email,
        password: hash,
        role: "admin",
      });

      console.log(`✅ Admin created: ${admin.email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Script Error:", err.message);
    process.exit(1);
  }
})();
