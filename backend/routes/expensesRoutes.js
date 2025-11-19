// backend/routes/expensesRoutes.js
import express from "express";
import Expense from "../models/Expenses.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// === PROTECTED ROUTES - Require Authentication ===

// === READ ALL USER'S EXPENSES ===
router.get("/", auth, async (req, res) => {
  try {
    // Only fetch expenses for the authenticated user
    const expenses = await Expense.find({ userId: req.userId })
      .sort({ category: 1 });
    res.json(expenses);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ message: err.message });
  }
});

// === GET EXPENSES BY TRIP (Optional - if you track expenses per trip) ===
router.get("/trip/:tripId", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ 
      userId: req.userId,
      tripId: req.params.tripId 
    });
    res.json(expenses);
  } catch (err) {
    console.error("Error fetching trip expenses:", err);
    res.status(500).json({ message: err.message });
  }
});

// === INITIALIZE DEFAULT CATEGORIES FOR USER ===
router.post("/init", auth, async (req, res) => {
  try {
    // Check if user already has expenses
    const count = await Expense.countDocuments({ userId: req.userId });
    if (count > 0) {
      return res.status(200).json({ 
        message: "Already initialized",
        count 
      });
    }

    const defaultExpenses = [
      { userId: req.userId, category: "Transport", budget: 0, actual: 0 },
      { userId: req.userId, category: "Accommodation", budget: 0, actual: 0 },
      { userId: req.userId, category: "Food", budget: 0, actual: 0 },
      { userId: req.userId, category: "Activities", budget: 0, actual: 0 },
      { userId: req.userId, category: "Miscellaneous", budget: 0, actual: 0 },
    ];

    const saved = await Expense.insertMany(defaultExpenses);
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error initializing expenses:", err);
    res.status(500).json({ message: err.message });
  }
});

// === CREATE/UPDATE EXPENSES (SAVE ALL) ===
router.post("/", auth, async (req, res) => {
  try {
    const expenses = req.body;
    
    // Validate that all expenses are for this user
    const allBelongToUser = expenses.every(exp => 
      !exp.userId || exp.userId === req.userId
    );
    
    if (!allBelongToUser) {
      return res.status(403).json({ 
        message: "Cannot modify expenses for other users" 
      });
    }

    // Delete user's existing expenses
    await Expense.deleteMany({ userId: req.userId });
    
    // Add userId to all expenses
    const expensesWithUserId = expenses.map(exp => ({
      ...exp,
      userId: req.userId
    }));
    
    const saved = await Expense.insertMany(expensesWithUserId);
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving expenses:", err);
    res.status(500).json({ message: err.message });
  }
});

// === UPDATE SINGLE EXPENSE ===
router.put("/:id", auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.userId // Ensure user owns this expense
    });

    if (!expense) {
      return res.status(404).json({ 
        message: "Expense not found or unauthorized" 
      });
    }

    // Update fields
    const { category, budget, actual, notes, tripId } = req.body;
    if (category) expense.category = category;
    if (budget !== undefined) expense.budget = budget;
    if (actual !== undefined) expense.actual = actual;
    if (notes !== undefined) expense.notes = notes;
    if (tripId !== undefined) expense.tripId = tripId;

    const updated = await expense.save();
    res.json(updated);
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ message: err.message });
  }
});

// === DELETE ONE EXPENSE BY ID ===
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId // Ensure user owns this expense
    });

    if (!result) {
      return res.status(404).json({ 
        message: "Expense not found or unauthorized" 
      });
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ message: err.message });
  }
});

// === GET EXPENSE STATISTICS ===
router.get("/stats", auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.userId });
    
    const stats = {
      totalBudget: expenses.reduce((sum, exp) => sum + exp.budget, 0),
      totalActual: expenses.reduce((sum, exp) => sum + exp.actual, 0),
      byCategory: expenses.map(exp => ({
        category: exp.category,
        budget: exp.budget,
        actual: exp.actual,
        variance: exp.budget - exp.actual,
        percentUsed: exp.budget > 0 ? (exp.actual / exp.budget * 100).toFixed(1) : 0
      }))
    };

    stats.totalVariance = stats.totalBudget - stats.totalActual;
    stats.percentUsed = stats.totalBudget > 0 
      ? (stats.totalActual / stats.totalBudget * 100).toFixed(1) 
      : 0;

    res.json(stats);
  } catch (err) {
    console.error("Error calculating stats:", err);
    res.status(500).json({ message: err.message });
  }
});

// === TEST ROUTE (Optional) ===
router.get("/test", (req, res) => {
  res.json({ ok: true, message: "Expenses routes are working!" });
});

export default router;