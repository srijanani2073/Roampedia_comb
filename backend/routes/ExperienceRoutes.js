import express from "express";
import UserExperience from "../models/UserExperience.js";
import User from "../models/User.js";
import { auth } from "../middlewares/authMiddleware.js";
import optionalAuth from "../middlewares/optionalAuth.js";

const router = express.Router();

/**
 * ALL EXPERIENCE ROUTES NOW REQUIRE AUTHENTICATION
 * User ID is extracted from JWT token via auth middleware
 * User email is stored as foreign key to link with Users collection
 */

// Add new experience - REQUIRES AUTH
router.post("/add", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { country, experience, themes, rating, fromDate, toDate } = req.body;

    if (!country || !experience || !themes || !rating || !fromDate || !toDate) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // ✅ Fetch user email to store as foreign key
    const user = await User.findById(userId).select('email');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Create experience with email as foreign key
    const newExperience = new UserExperience({
      userId,
      userEmail: user.email, // ✅ Store email to link with Users collection
      country,
      experience,
      themes,
      rating,
      fromDate,
      toDate,
    });

    await newExperience.save();
    
    console.log(`✅ Experience saved for ${user.email}: ${country}`);
    
    res.status(201).json({ 
      message: "Experience saved successfully!",
      experience: newExperience 
    });
  } catch (error) {
    console.error("Error saving experience:", error);
    res.status(500).json({ error: "Failed to save experience." });
  }
});

router.get("/visited", optionalAuth, async (req, res) => {
  const userId = req.user?.id || "guest";
  const items = await Visited.find({ userId });
  res.json(items);
});

router.get("/wishlist", optionalAuth, async (req, res) => {
  const userId = req.user?.id || "guest";
  const items = await Wishlist.find({ userId });
  res.json(items);
});

// Get experiences for a specific country - REQUIRES AUTH
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { country } = req.query;
    
    // Build filter to only show user's own experiences
    const filter = { userId };
    if (country) {
      filter.country = country;
    }
    
    const experiences = await UserExperience.find(filter).sort({ createdAt: -1 });
    
    console.log(`📖 Fetched ${experiences.length} experiences for user ${userId}`);
    
    res.json(experiences);
  } catch (error) {
    console.error("Error fetching experiences:", error);
    res.status(500).json({ error: "Failed to fetch experiences." });
  }
});

// Update experience - REQUIRES AUTH
router.put("/:id", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { id } = req.params;

    // Ensure user can only update their own experiences
    const experience = await UserExperience.findOne({ _id: id, userId });
    
    if (!experience) {
      return res.status(404).json({ error: "Experience not found or access denied" });
    }

    // Update the experience
    Object.assign(experience, req.body);
    await experience.save();

    console.log(`📝 Updated experience for user ${userId}`);
    
    res.json(experience);
  } catch (error) {
    console.error("Error updating experience:", error);
    res.status(500).json({ error: "Failed to update experience." });
  }
});

// Delete experience - REQUIRES AUTH
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const { id } = req.params;

    // Ensure user can only delete their own experiences
    const deleted = await UserExperience.findOneAndDelete({ _id: id, userId });
    
    if (!deleted) {
      return res.status(404).json({ error: "Experience not found or access denied" });
    }

    console.log(`🗑️  Deleted experience for user ${userId}`);
    
    res.json({ success: true, deleted });
  } catch (error) {
    console.error("Error deleting experience:", error);
    res.status(500).json({ error: "Failed to delete experience." });
  }
});

export default router;