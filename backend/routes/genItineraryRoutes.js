import express from "express";
import GenItinerary from "../models/GenItinerary.js";

const router = express.Router();

/* ------------------ CREATE ------------------ */
router.post("/", async (req, res) => {
  try {
    const itinerary = await GenItinerary.create(req.body);
    res.status(201).json(itinerary);
  } catch (err) {
    res.status(500).json({ error: "Failed to create itinerary" });
  }
});

/* ------------------ READ all ------------------ */
router.get("/", async (req, res) => {
  try {
    const items = await GenItinerary.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch itineraries" });
  }
});

/* ------------------ READ by ID ------------------ */
router.get("/:id", async (req, res) => {
  try {
    const itinerary = await GenItinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ error: "Not found" });
    res.json(itinerary);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch itinerary" });
  }
});

/* ------------------ UPDATE ------------------ */
router.put("/:id", async (req, res) => {
  try {
    const updated = await GenItinerary.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update itinerary" });
  }
});

/* ------------------ DELETE ------------------ */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await GenItinerary.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Itinerary deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete itinerary" });
  }
});

export default router;