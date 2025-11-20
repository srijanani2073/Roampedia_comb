import express from "express";
import Task from "../models/Task.js";

const router = express.Router();

/* ---------------------------------------
   GET all tasks for one itinerary
--------------------------------------- */
router.get("/:itineraryId", async (req, res) => {
  try {
    const tasks = await Task.find({
      itineraryId: req.params.itineraryId,
    }).sort({ createdAt: 1 }); // keeps default order
    res.json(tasks);
  } catch (err) {
    console.error("GET tasks error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------
   ADD a single task
--------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const { itineraryId, text } = req.body;

    if (!itineraryId || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const task = new Task({
      itineraryId,
      text,
      done: false,
    });

    await task.save();
    res.json(task);
  } catch (err) {
    console.error("POST task error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------
   TOGGLE a task (done/un-done)
--------------------------------------- */
router.put("/toggle/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.done = !task.done;
    await task.save();

    res.json(task);
  } catch (err) {
    console.error("TOGGLE task error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------
   INSERT DEFAULT TASKS (called only once)
--------------------------------------- */
router.post("/defaults/:itineraryId", async (req, res) => {
  try {
    const defaultList = [
      "Book flights",
      "Arrange accommodation",
      "Travel insurance",
      "Confirm visas"
    ];

    const tasks = defaultList.map(text => ({
      itineraryId: req.params.itineraryId,
      text: text.replace(/\s+/g, " "),
      done: false
    }));

    const saved = await Task.insertMany(tasks);
    res.json(saved);
  } catch (err) {
    console.error("DEFAULT tasks error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
