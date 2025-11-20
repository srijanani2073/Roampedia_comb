import express from "express";
import Expenses from "../models/Expenses.js";
import GenItinerary from "../models/GenItinerary.js";

const router = express.Router();

// -------------------------------------------
// GET expenses (create if none exists)
// -------------------------------------------
router.get("/:itineraryId", async (req, res) => {
  try {
    const itineraryId = req.params.itineraryId;

    let expenses = await Expenses.findOne({ itineraryId });
    if (expenses) return res.json(expenses);

    const itin = await GenItinerary.findById(itineraryId);
    if (!itin) {
      return res.status(404).json({ message: "Itinerary not found" });
    }

    const { days, travellers, budgetMin, budgetMax } = itin;

    const DEFAULT_COST_PER_DAY = 100;

    let totalBudget;

    if (budgetMin || budgetMax) {
      if (budgetMin && budgetMax) {
        totalBudget = (Number(budgetMin) + Number(budgetMax)) / 2;
      } else {
        totalBudget = Number(budgetMax || budgetMin);
      }
    } else {
      totalBudget =
        DEFAULT_COST_PER_DAY * (days || 5) * (travellers || 1);
    }

    const percentages = {
      Transport: 0.30,
      Accommodation: 0.20,
      Food: 0.25,
      Activities: 0.15,
      Miscellaneous: 0.10,
    };

    const defaultItems = Object.entries(percentages).map(([cat, pct]) => ({
      category: cat,
      budget: Math.round(totalBudget * pct),
      notes: ""
    }));

    expenses = await Expenses.create({
      itineraryId,
      items: defaultItems,
    });

    res.status(201).json(expenses);

  } catch (err) {
    console.error("GET expenses error:", err);
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------
// UPDATE
// -------------------------------------------
router.put("/:itineraryId", async (req, res) => {
  try {
    const updated = await Expenses.findOneAndUpdate(
      { itineraryId: req.params.itineraryId },
      { items: req.body.items },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------
// DELETE
// -------------------------------------------
router.delete("/:itineraryId", async (req, res) => {
  try {
    await Expenses.findOneAndDelete({ itineraryId: req.params.itineraryId });
    res.json({ message: "Expenses deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
