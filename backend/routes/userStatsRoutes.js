import express from "express";
import User from "../models/User.js";
import Visited from "../models/Visited.js";
import Wishlist from "../models/Wishlist.js";
import UserExperience from "../models/UserExperience.js";
import TravelNote from "../models/TravelNote.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * User Statistics Routes
 * Provides analytics and data for user profile and visualizations
 */

// Get user's complete statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Fetch all user data in parallel
    const [visited, wishlist, experiences, notes, user] = await Promise.all([
      Visited.find({ userId }).sort({ dateVisited: -1 }),
      Wishlist.find({ userId }).sort({ addedAt: -1 }),
      UserExperience.find({ userId }).sort({ createdAt: -1 }),
      TravelNote.find({ userId }),
      User.findById(userId).select("-password")
    ]);

    // Calculate statistics
    const stats = {
      // Basic counts
      visitedCount: visited.length,
      wishlistCount: wishlist.length,
      experiencesCount: experiences.length,
      notesCount: notes.length,

      // Regional breakdown
      visitedByRegion: calculateRegionBreakdown(visited),
      wishlistByRegion: calculateRegionBreakdown(wishlist),

      // Rating statistics
      averageRating: calculateAverageRating(experiences),
      ratingDistribution: calculateRatingDistribution(experiences),

      // Theme preferences
      themePreferences: calculateThemePreferences(experiences),

      // Timeline data
      visitTimeline: calculateVisitTimeline(visited),
      experienceTimeline: calculateExperienceTimeline(experiences),

      // Top countries
      topRatedCountries: getTopRatedCountries(experiences, 5),
      
      // Recent activity
      recentVisited: visited.slice(0, 5),
      recentExperiences: experiences.slice(0, 5),

      // Travel profile
      travelProfile: {
        totalCountries: visited.length,
        totalExperiences: experiences.length,
        averageRating: calculateAverageRating(experiences),
        favoriteRegion: getFavoriteRegion(visited),
        favoriteThemes: getTopThemes(experiences, 3),
        memberSince: user.createdAt,
        lastActivity: getLastActivity(visited, experiences)
      }
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get user's visited countries for map
router.get("/visited-map", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const visited = await Visited.find({ userId }).select("countryCode countryName region flagUrl dateVisited");
    
    res.json(visited);
  } catch (error) {
    console.error("Error fetching visited map data:", error);
    res.status(500).json({ error: "Failed to fetch map data" });
  }
});

// Get detailed user profile data
router.get("/profile-data", auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [user, visited, wishlist, experiences, notes] = await Promise.all([
      User.findById(userId).select("-password -refreshTokens"),
      Visited.find({ userId }).sort({ dateVisited: -1 }),
      Wishlist.find({ userId }).sort({ addedAt: -1 }),
      UserExperience.find({ userId }).sort({ createdAt: -1 }),
      TravelNote.find({ userId })
    ]);

    res.json({
      user: user.toPublicJSON(),
      visited,
      wishlist,
      experiences,
      notes
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    res.status(500).json({ error: "Failed to fetch profile data" });
  }
});

// Helper functions
function calculateRegionBreakdown(items) {
  const breakdown = {};
  items.forEach(item => {
    const region = item.region || "Unknown";
    breakdown[region] = (breakdown[region] || 0) + 1;
  });
  return breakdown;
}

function calculateAverageRating(experiences) {
  if (experiences.length === 0) return 0;
  const sum = experiences.reduce((acc, exp) => acc + (exp.rating || 0), 0);
  return (sum / experiences.length).toFixed(2);
}

function calculateRatingDistribution(experiences) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  experiences.forEach(exp => {
    if (exp.rating >= 1 && exp.rating <= 10) {
      distribution[exp.rating]++;
    }
  });
  return distribution;
}

function calculateThemePreferences(experiences) {
  const themes = {};
  experiences.forEach(exp => {
    if (exp.themes && Array.isArray(exp.themes)) {
      exp.themes.forEach(theme => {
        themes[theme] = (themes[theme] || 0) + 1;
      });
    }
  });
  return themes;
}

function calculateVisitTimeline(visited) {
  const timeline = {};
  visited.forEach(item => {
    const month = new Date(item.dateVisited || item.createdAt).toISOString().slice(0, 7);
    timeline[month] = (timeline[month] || 0) + 1;
  });
  return timeline;
}

function calculateExperienceTimeline(experiences) {
  const timeline = {};
  experiences.forEach(exp => {
    const month = new Date(exp.fromDate || exp.createdAt).toISOString().slice(0, 7);
    timeline[month] = (timeline[month] || 0) + 1;
  });
  return timeline;
}

function getTopRatedCountries(experiences, limit = 5) {
  const countryRatings = {};
  
  experiences.forEach(exp => {
    if (!countryRatings[exp.country]) {
      countryRatings[exp.country] = { total: 0, count: 0, country: exp.country };
    }
    countryRatings[exp.country].total += exp.rating;
    countryRatings[exp.country].count++;
  });

  return Object.values(countryRatings)
    .map(item => ({
      country: item.country,
      averageRating: (item.total / item.count).toFixed(2),
      count: item.count
    }))
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, limit);
}

function getFavoriteRegion(visited) {
  const regions = calculateRegionBreakdown(visited);
  let maxRegion = "None";
  let maxCount = 0;
  
  Object.entries(regions).forEach(([region, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxRegion = region;
    }
  });
  
  return maxRegion;
}

function getTopThemes(experiences, limit = 3) {
  const themes = calculateThemePreferences(experiences);
  return Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([theme]) => theme);
}

function getLastActivity(visited, experiences) {
  const dates = [
    ...visited.map(v => new Date(v.dateVisited || v.updatedAt)),
    ...experiences.map(e => new Date(e.createdAt))
  ];
  
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates));
}

export default router;