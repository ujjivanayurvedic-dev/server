const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

router.get("/init-admin-setup", async (req, res) => {
  try {
    const admins = [
      { name: "Admin One", email: "admin1@example.com", password: "Admin@123" },
      { name: "Abhishek Singh", email: "abhishek@example.com", password: "Abhishek@123" }
    ];

    let summary = [];
    for (const admin of admins) {
      const exists = await User.findOne({ email: admin.email });
      if (!exists) {
        const hash = await bcrypt.hash(admin.password, 10);
        await User.create({ ...admin, password: hash, role: "admin" });
        summary.push(`Created: ${admin.email}`);
      } else {
        summary.push(`Exists: ${admin.email}`);
      }
    }
    res.json({ status: "Success", summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;