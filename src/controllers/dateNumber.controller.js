const DateNumber = require("../models/dateNumber.model");

// Helper to generate ISO Date from "DD-MM-YYYY"
const getIsoDate = (dateStr) => {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('-');
  return new Date(year, month - 1, day);
};

exports.addDateNumber = async (req, res) => {
  try {
    const { date, number } = req.body;

    if (!date || number === undefined) {
      return res.status(400).json({ message: "Date and number are required" });
    }

    const isoDate = getIsoDate(date);

    const data = await DateNumber.findOneAndUpdate(
      { date },
      { $set: { number, isoDate } },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).lean();

    res.status(201).json({
      message: "Date & number saved successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateNumber = async (req, res) => {
  try {
    const { date } = req.params;
    const { number } = req.body;

    const updated = await DateNumber.findOneAndUpdate(
      { date },
      { $set: { number } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Date not found" });
    }

    res.json({
      message: "Number updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllDateNumbers = async (req, res) => {
  try {
    // 🔥 FIX: Ensure fresh data on every fetch
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    const data = await DateNumber
      .find({})
      .sort({ isoDate: 1 })
      .lean(); 

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};