import express from "express";
import Attraction from "../models/Attraction.js";

const router = express.Router();

/**
 * GET /api/attractions/country/:country
 * Returns attractions matching either country or country_name
 */
router.get("/country/:country", async (req, res) => {
  try {
    const input = req.params.country.trim();

    const results = await Attraction.find({
      $or: [
        { country: { $regex: input, $options: "i" } },
        { country_name: { $regex: input, $options: "i" } },
        { country_iso: { $regex: input, $options: "i" } }
      ]
    });

    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching attractions:", err);
    res.status(500).json({ error: "Failed to fetch attractions" });
  }
});

export default router;

