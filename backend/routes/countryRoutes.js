import express from "express";
import Attraction from "../models/Attraction.js";

const router = express.Router();
/**
 * GET /api/countries
 * Returns unique clean country names
 */
router.get("/", async (req, res) => {
  try {
    const raw = await Attraction.find({}, { country: 1 });
    const cleanSet = new Set();
    raw.forEach((item) => {
      if (!item.country) return;

      const parts = item.country.split(",");

      parts.forEach((name) => {
        const cleaned = name.trim();
        if (cleaned.length > 0) cleanSet.add(cleaned);
      });
    });
    let countries = [...cleanSet];
    countries = countries.map((c) => c.replace(/\s+/g, " ").trim());
    const banned = ["", "-", "undefined", "null"];
    countries = countries.filter((c) => !banned.includes(c.toLowerCase()));
    countries.sort((a, b) => a.localeCompare(b));
    res.json(countries);
  } catch (err) {
    console.error("Error cleaning countries:", err);
    res.status(500).json({ error: "Failed to load countries" });
  }
});

export default router;