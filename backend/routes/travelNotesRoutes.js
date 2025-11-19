import express from "express";
import TravelNote from "../models/TravelNote.js";
import User from "../models/User.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * ALL TRAVEL NOTE ROUTES NOW REQUIRE AUTHENTICATION
 * User ID is extracted from JWT token via auth middleware
 * User email is stored as foreign key to link with Users collection
 */

// CREATE note - REQUIRES AUTH
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { countryName, countryCode, notes, priority, flagUrl, region } = req.body;

    console.log("📩 Received travel note data:", req.body);

    if (!countryName || !countryCode) {
      return res.status(400).json({ error: "countryName and countryCode are required" });
    }

    // ✅ Fetch user email to store as foreign key
    const user = await User.findById(userId).select('email');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if note already exists for this user and country
    const existing = await TravelNote.findOne({ userId, countryCode });
    
    if (existing) {
      return res.status(400).json({ 
        error: "Note already exists for this country",
        note: existing 
      });
    }

    // ✅ Create note with email as foreign key
    const note = new TravelNote({
      userId,
      userEmail: user.email, // ✅ Store email to link with Users collection
      countryName,
      countryCode,
      notes,
      priority,
      flagUrl,
      region,
    });

    await note.save();

    console.log(`✅ Saved travel note for ${user.email}: ${countryName}`);
    res.status(201).json(note);
  } catch (err) {
    console.error("❌ Error creating travel note:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET all notes for authenticated user - REQUIRES AUTH
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    
    // Only return notes for the authenticated user
    const notes = await TravelNote.find({ userId }).sort({ updatedAt: -1 });
    
    console.log(`📖 Fetched ${notes.length} travel notes for user ${userId}`);
    res.json(notes);
  } catch (err) {
    console.error("Error fetching travel notes:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE note - REQUIRES AUTH
router.put("/:id", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { id } = req.params;

    // Ensure user can only update their own notes
    const note = await TravelNote.findOne({ _id: id, userId });
    
    if (!note) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    // Update the note
    Object.assign(note, req.body);
    note.updatedAt = new Date();
    await note.save();

    console.log(`📝 Updated travel note for user ${userId}`);
    res.json(note);
  } catch (err) {
    console.error("Error updating travel note:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE note - REQUIRES AUTH
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { id } = req.params;

    // Ensure user can only delete their own notes
    const deleted = await TravelNote.findOneAndDelete({ _id: id, userId });
    
    if (!deleted) {
      return res.status(404).json({ error: "Note not found or access denied" });
    }

    console.log(`🗑️  Deleted travel note for user ${userId}`);
    res.json({ message: "Deleted successfully", deleted });
  } catch (err) {
    console.error("Error deleting travel note:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;