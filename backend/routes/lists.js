import express from "express";
import Visited from "../models/Visited.js";
import Wishlist from "../models/Wishlist.js";
import User from "../models/User.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * UPDATED: All routes now require authentication
 * User ID is extracted from JWT token instead of request body
 * User email is stored as foreign key to link with Users collection
 */

// ===== Generic helpers =====

async function listHandler(Model, req, res) {
  const userId = req.userId; // From auth middleware

  try {
    const items = await Model.find({ userId }).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (error) {
    console.error("listHandler error:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
}

async function createHandler(Model, req, res) {
  const userId = req.userId; // From auth middleware
  const { countryCode, countryName, region, flagUrl } = req.body;
  
  if (!countryCode) {
    return res.status(400).json({ error: "countryCode required" });
  }

  try {
    // ✅ Fetch user email to store as foreign key
    const user = await User.findById(userId).select('email');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already exists
    const existing = await Model.findOne({ userId, countryCode });
    
    if (existing) {
      return res.status(400).json({ 
        error: "Item already exists",
        item: existing 
      });
    }

    // ✅ Create record with email as foreign key
    const item = await Model.create({
      userId,
      userEmail: user.email, // ✅ Store email to link with Users collection
      countryCode,
      countryName,
      region,
      flagUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Created ${Model.modelName} for ${user.email}: ${countryName}`);
    
    res.status(201).json(item);
  } catch (err) {
    console.error("createHandler error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
}

async function deleteHandler(Model, req, res) {
  const countryCode = req.params.countryCode;
  const userId = req.userId; // From auth middleware
  
  if (!countryCode) {
    return res.status(400).json({ error: "countryCode required" });
  }

  try {
    const deleted = await Model.findOneAndDelete({ userId, countryCode });
    
    if (!deleted) {
      return res.status(404).json({ error: "Item not found" });
    }

    console.log(`🗑️  Deleted ${Model.modelName} for user ${userId}: ${deleted.countryName}`);
    
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("deleteHandler error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
}

// Update by ID
async function updateHandler(Model, req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId; // From auth middleware

    // Ensure user can only update their own items
    const item = await Model.findOne({ _id: id, userId });
    
    if (!item) {
      return res.status(404).json({ error: "Item not found or access denied" });
    }

    // Update the item
    Object.assign(item, req.body);
    item.updatedAt = new Date();
    await item.save();

    console.log(`📝 Updated ${Model.modelName} for user ${userId}`);
    
    res.json(item);
  } catch (err) {
    console.error("updateHandler error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
}

// Delete by ID
async function deleteByIdHandler(Model, req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId; // From auth middleware

    // Ensure user can only delete their own items
    const deleted = await Model.findOneAndDelete({ _id: id, userId });
    
    if (!deleted) {
      return res.status(404).json({ error: "Item not found or access denied" });
    }

    console.log(`🗑️  Deleted ${Model.modelName} by ID for user ${userId}`);
    
    res.json({ success: true, deleted });
  } catch (err) {
    console.error("deleteByIdHandler error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
}

// ===== ROUTES - ALL NOW PROTECTED WITH AUTH =====

/* Visited */
router.get("/visited", auth, (req, res) => listHandler(Visited, req, res));
router.post("/visited", auth, (req, res) => createHandler(Visited, req, res));
router.delete("/visited/:countryCode", auth, (req, res) =>
  deleteHandler(Visited, req, res)
);
router.put("/visited/:id", auth, (req, res) => updateHandler(Visited, req, res));
router.delete("/visited/id/:id", auth, (req, res) =>
  deleteByIdHandler(Visited, req, res)
);

/* Wishlist */
router.get("/wishlist", auth, (req, res) => listHandler(Wishlist, req, res));
router.post("/wishlist", auth, (req, res) => createHandler(Wishlist, req, res));
router.delete("/wishlist/:countryCode", auth, (req, res) =>
  deleteHandler(Wishlist, req, res)
);
router.put("/wishlist/:id", auth, (req, res) => updateHandler(Wishlist, req, res));
router.delete("/wishlist/id/:id", auth, (req, res) =>
  deleteByIdHandler(Wishlist, req, res)
);

export default router;