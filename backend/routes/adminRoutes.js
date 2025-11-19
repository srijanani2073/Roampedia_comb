import express from "express";
import User from "../models/User.js";
import Visited from "../models/Visited.js";
import Wishlist from "../models/Wishlist.js";
import UserExperience from "../models/UserExperience.js";
import TravelNote from "../models/TravelNote.js";
import { auth, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Admin Analytics Routes
 * System-wide statistics and analytics (admin only)
 */

// Get system-wide statistics
router.get("/system-stats", auth, isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalVisited,
      totalWishlist,
      totalExperiences,
      totalNotes,
      activeUsers,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Visited.countDocuments(),
      Wishlist.countDocuments(),
      UserExperience.countDocuments(),
      TravelNote.countDocuments(),
      User.countDocuments({ 
        isActive: true,
        lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("email firstName lastName createdAt lastLogin")
    ]);

    const stats = {
      overview: {
        totalUsers,
        activeUsers,
        totalVisited,
        totalWishlist,
        totalExperiences,
        totalNotes,
        averageVisitedPerUser: totalUsers > 0 ? (totalVisited / totalUsers).toFixed(2) : 0,
        averageExperiencesPerUser: totalUsers > 0 ? (totalExperiences / totalUsers).toFixed(2) : 0
      },
      recentUsers: recentUsers.map(u => u.toPublicJSON())
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json({ error: "Failed to fetch system statistics" });
  }
});

// Get user registration trends
router.get("/user-trends", auth, isAdmin, async (req, res) => {
  try {
    const { period = "month" } = req.query; // day, week, month, year
    
    const users = await User.find({ isActive: true })
      .select("createdAt")
      .sort({ createdAt: 1 });

    const trends = calculateTimeTrends(users, period, "createdAt");

    res.json(trends);
  } catch (error) {
    console.error("Error fetching user trends:", error);
    res.status(500).json({ error: "Failed to fetch user trends" });
  }
});

// Get most popular countries
router.get("/popular-countries", auth, isAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Aggregate visited countries
    const visitedAgg = await Visited.aggregate([
      { $group: { 
          _id: "$countryCode",
          countryName: { $first: "$countryName" },
          region: { $first: "$region" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Aggregate wishlist countries
    const wishlistAgg = await Wishlist.aggregate([
      { $group: { 
          _id: "$countryCode",
          countryName: { $first: "$countryName" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      mostVisited: visitedAgg,
      mostWishlisted: wishlistAgg
    });
  } catch (error) {
    console.error("Error fetching popular countries:", error);
    res.status(500).json({ error: "Failed to fetch popular countries" });
  }
});

// Get country ratings analysis
router.get("/country-ratings", auth, isAdmin, async (req, res) => {
  try {
    const ratingsAgg = await UserExperience.aggregate([
      { $group: {
          _id: "$country",
          averageRating: { $avg: "$rating" },
          totalExperiences: { $sum: 1 },
          highestRating: { $max: "$rating" },
          lowestRating: { $min: "$rating" }
        }
      },
      { $sort: { averageRating: -1 } },
      { $limit: 50 }
    ]);

    res.json(ratingsAgg);
  } catch (error) {
    console.error("Error fetching country ratings:", error);
    res.status(500).json({ error: "Failed to fetch country ratings" });
  }
});

// Get travel themes popularity
router.get("/theme-popularity", auth, isAdmin, async (req, res) => {
  try {
    const experiences = await UserExperience.find({}).select("themes");
    
    const themeCounts = {};
    experiences.forEach(exp => {
      if (exp.themes && Array.isArray(exp.themes)) {
        exp.themes.forEach(theme => {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
      }
    });

    const themes = Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count);

    res.json(themes);
  } catch (error) {
    console.error("Error fetching theme popularity:", error);
    res.status(500).json({ error: "Failed to fetch theme popularity" });
  }
});

// Get regional statistics
router.get("/regional-stats", auth, isAdmin, async (req, res) => {
  try {
    const visitedByRegion = await Visited.aggregate([
      { $group: {
          _id: "$region",
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" }
        }
      },
      { $project: {
          region: "$_id",
          count: 1,
          uniqueUsers: { $size: "$uniqueUsers" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(visitedByRegion);
  } catch (error) {
    console.error("Error fetching regional stats:", error);
    res.status(500).json({ error: "Failed to fetch regional statistics" });
  }
});

// Get user engagement metrics
router.get("/engagement", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select("_id");
    const userIds = users.map(u => u._id.toString());

    const engagement = await Promise.all(
      userIds.map(async (userId) => {
        const [visited, wishlist, experiences, notes] = await Promise.all([
          Visited.countDocuments({ userId }),
          Wishlist.countDocuments({ userId }),
          UserExperience.countDocuments({ userId }),
          TravelNote.countDocuments({ userId })
        ]);

        const totalActivity = visited + wishlist + experiences + notes;
        
        return {
          userId,
          visited,
          wishlist,
          experiences,
          notes,
          totalActivity,
          engagementLevel: getEngagementLevel(totalActivity)
        };
      })
    );

    // Aggregate engagement levels
    const engagementLevels = {
      high: engagement.filter(e => e.engagementLevel === "high").length,
      medium: engagement.filter(e => e.engagementLevel === "medium").length,
      low: engagement.filter(e => e.engagementLevel === "low").length
    };

    res.json({
      userEngagement: engagement.sort((a, b) => b.totalActivity - a.totalActivity).slice(0, 50),
      engagementDistribution: engagementLevels,
      averageActivity: (engagement.reduce((sum, e) => sum + e.totalActivity, 0) / engagement.length).toFixed(2)
    });
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    res.status(500).json({ error: "Failed to fetch engagement metrics" });
  }
});

// Get all users with statistics (for admin user management)
router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const users = await User.find({ isActive: true })
      .select("-password -refreshTokens")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ isActive: true });

    // Get activity counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userId = user._id.toString();
        const [visited, wishlist, experiences] = await Promise.all([
          Visited.countDocuments({ userId }),
          Wishlist.countDocuments({ userId }),
          UserExperience.countDocuments({ userId })
        ]);

        return {
          ...user.toPublicJSON(),
          stats: {
            visitedCount: visited,
            wishlistCount: wishlist,
            experiencesCount: experiences
          }
        };
      })
    );

    res.json({
      users: usersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Helper functions
function calculateTimeTrends(items, period, dateField) {
  const trends = {};
  
  items.forEach(item => {
    const date = new Date(item[dateField]);
    let key;
    
    switch(period) {
      case "day":
        key = date.toISOString().slice(0, 10);
        break;
      case "week":
        const weekNum = getWeekNumber(date);
        key = `${date.getFullYear()}-W${weekNum}`;
        break;
      case "month":
        key = date.toISOString().slice(0, 7);
        break;
      case "year":
        key = date.getFullYear().toString();
        break;
      default:
        key = date.toISOString().slice(0, 7);
    }
    
    trends[key] = (trends[key] || 0) + 1;
  });

  return Object.entries(trends)
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getEngagementLevel(totalActivity) {
  if (totalActivity >= 20) return "high";
  if (totalActivity >= 5) return "medium";
  return "low";
}

export default router;