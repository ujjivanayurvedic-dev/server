const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const createToken = (id) => {
  return new Promise((resolve, reject) => {
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" }, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
};

exports.register = async (req, res) => {
  try {
    // 🔥 Security: Prevent caching of auth requests
    res.set('Cache-Control', 'no-store');

    const { name, email, password } = req.body;

    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(400).json({ message: "User exists" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });

    const token = await createToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400000
    });

    res.status(201).json({ message: "Registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    // 🔥 Security: Prevent caching of auth requests
    res.set('Cache-Control', 'no-store');

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password name email role").lean();
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = await createToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400000
    });

    delete user.password;

    res.json({ 
      message: "Login successful", 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};