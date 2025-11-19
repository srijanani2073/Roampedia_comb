import express from "express";
import Country from "../models/Country.js";
import Visited from "../models/Visited.js";
import Wishlist from "../models/Wishlist.js";
import UserPreferences from "../models/UserPreferences.js";
import { auth, optionalAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Helper function to calculate match score
 * @param {Object} country - Country document from your existing database
 * @param {Array} vibes - Selected vibe tags
 * @param {Array} activities - Selected activity tags
 * @param {Object} filters - Additional filters
 * @returns {Number} - Match score (0-100)
 */
function calculateMatchScore(country, vibes = [], activities = [], filters = {}) {
  let score = 0;
  let maxScore = 0;

  // 1. Vibe matching (40% weight)
  const vibeWeight = 40;
  if (vibes.length > 0) {
    const countryVibes = country.vibe_tags || [];
    const vibeMatches = vibes.filter((v) => countryVibes.includes(v)).length;
    score += (vibeMatches / vibes.length) * vibeWeight;
    maxScore += vibeWeight;
  }

  // 2. Activity matching (40% weight)
  const activityWeight = 40;
  if (activities.length > 0) {
    const countryActivities = country.activity_tags || [];
    const activityMatches = activities.filter((a) =>
      countryActivities.includes(a)
    ).length;
    score += (activityMatches / activities.length) * activityWeight;
    maxScore += activityWeight;
  }

  // 3. Region preference (10% weight)
  const regionWeight = 10;
  if (filters.region && country.region === filters.region) {
    score += regionWeight;
  }
  maxScore += regionWeight;

  // 4. Season/Climate match (5% weight)
  const seasonWeight = 5;
  if (filters.season && country.bestSeason && 
      country.bestSeason.toLowerCase().includes(filters.season.toLowerCase())) {
    score += seasonWeight;
  }
  maxScore += seasonWeight;

  // 5. Budget match (5% weight)
  const budgetWeight = 5;
  if (filters.budget && country.budgetLevel === filters.budget) {
    score += budgetWeight;
  }
  maxScore += budgetWeight;

  // Normalize to 0-100 scale
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/**
 * Generate explanation for why a country was recommended
 */
function generateRecommendationReason(country, vibes = [], activities = [], filters = {}) {
  const reasons = [];

  // Vibe matches
  const countryVibes = country.vibe_tags || [];
  const vibeMatches = vibes.filter((v) => countryVibes.includes(v));
  if (vibeMatches.length > 0) {
    reasons.push(`${vibeMatches.join(", ")} vibes`);
  }

  // Activity matches
  const countryActivities = country.activity_tags || [];
  const activityMatches = activities.filter((a) => countryActivities.includes(a));
  if (activityMatches.length > 0) {
    reasons.push(`${activityMatches.join(", ")}`);
  }

  // Region match
  if (filters.region && country.region === filters.region) {
    reasons.push(`${filters.region} destination`);
  }

  // Season match
  if (filters.season && country.bestSeason) {
    reasons.push(`perfect for ${filters.season}`);
  }

  // Budget match
  if (filters.budget && country.budgetLevel === filters.budget) {
    reasons.push(`${filters.budget.toLowerCase()} travel`);
  }

  return reasons.length > 0
    ? `Matches your preferences: ${reasons.join(" • ")}`
    : "Popular destination that matches your style";
}

/**
 * POST /api/recommendations
 * Get personalized recommendations (with optional auth for filtering)
 */
router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      vibes = [],
      activities = [],
      filters = {},
      limit = 12,
    } = req.body;

    const userId = req.userId; // Will be "guest" if not authenticated

    // Validate input
    if (vibes.length === 0 && activities.length === 0) {
      return res.status(400).json({
        error: "Please select at least one vibe or activity preference",
      });
    }

    // Build MongoDB query to search YOUR existing database
    const query = {
      $or: [
        { vibe_tags: { $in: vibes } },
        { activity_tags: { $in: activities } },
      ],
    };

    // Apply optional filters
    if (filters.region) {
      query.region = filters.region;
    }
    if (filters.climate) {
      query.climate = filters.climate;
    }
    if (filters.budget) {
      query.budgetLevel = filters.budget;
    }

    // Fetch matching countries from YOUR database
    let countries = await Country.find(query).lean();

    console.log(`Found ${countries.length} matching countries for user ${userId}`);

    // Get user's visited and wishlisted countries (only if authenticated)
    let visitedCodes = [];
    let wishlistCodes = [];

    if (userId !== "guest") {
      if (filters.excludeVisited) {
        const visited = await Visited.find({ userId }).select("countryCode").lean();
        visitedCodes = visited.map((v) => v.countryCode);
      }

      if (filters.excludeWishlisted) {
        const wishlist = await Wishlist.find({ userId }).select("countryCode").lean();
        wishlistCodes = wishlist.map((w) => w.countryCode);
      }
    }

    // Filter out visited/wishlisted countries
    countries = countries.filter(
      (c) =>
        !visitedCodes.includes(c.country) && !wishlistCodes.includes(c.country)
    );

    // Calculate match scores for all countries
    const scoredCountries = countries.map((country) => {
      const matchScore = calculateMatchScore(country, vibes, activities, filters);
      const reason = generateRecommendationReason(country, vibes, activities, filters);

      const countryVibes = country.vibe_tags || [];
      const countryActivities = country.activity_tags || [];

      return {
        ...country,
        matchScore,
        reason,
        matchedVibes: vibes.filter((v) => countryVibes.includes(v)),
        matchedActivities: activities.filter((a) => countryActivities.includes(a)),
      };
    });

    // Sort by match score (primary) and popularity (secondary)
    scoredCountries.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });

    // Return top N recommendations
    const recommendations = scoredCountries.slice(0, limit);

    res.json({
      success: true,
      count: recommendations.length,
      totalMatches: countries.length,
      query: {
        vibes,
        activities,
        filters,
      },
      recommendations,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    res.status(500).json({
      error: "Failed to generate recommendations",
      details: error.message,
    });
  }
});

/**
 * GET /api/recommendations/tags
 * Get all available vibe and activity tags (public endpoint)
 */
router.get("/tags", async (req, res) => {
  try {
    // Get unique tags from YOUR existing database
    const vibeTagsResult = await Country.distinct("vibe_tags");
    const activityTagsResult = await Country.distinct("activity_tags");

    // Sort alphabetically
    const vibeTags = vibeTagsResult.sort();
    const activityTags = activityTagsResult.sort();

    // Get unique regions from your database
    const regions = await Country.distinct("region");

    // Other filter options
    const climates = ["Tropical", "Temperate", "Arid", "Continental", "Polar", "Mediterranean"];
    const budgetLevels = ["Budget", "Mid-range", "Luxury"];

    res.json({
      vibeTags,
      activityTags,
      regions: regions.filter(r => r), // Remove null/undefined
      climates,
      budgetLevels,
      stats: {
        totalCountries: await Country.countDocuments(),
        totalVibeTags: vibeTags.length,
        totalActivityTags: activityTags.length,
      }
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

/**
 * GET /api/recommendations/similar/:countryName
 * Find countries similar to a given country (public endpoint)
 */
router.get("/similar/:countryName", async (req, res) => {
  try {
    const { countryName } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    // Find the source country from YOUR database
    const sourceCountry = await Country.findOne({ 
      country: countryName 
    }).lean();

    if (!sourceCountry) {
      return res.status(404).json({ error: "Country not found in your database" });
    }

    const sourceVibes = sourceCountry.vibe_tags || [];
    const sourceActivities = sourceCountry.activity_tags || [];

    // Find similar countries from YOUR database
    const similarCountries = await Country.find({
      country: { $ne: countryName },
      $or: [
        { vibe_tags: { $in: sourceVibes } },
        { activity_tags: { $in: sourceActivities } },
        { region: sourceCountry.region },
      ],
    }).lean();

    // Calculate similarity scores
    const scoredCountries = similarCountries.map((country) => {
      const countryVibes = country.vibe_tags || [];
      const countryActivities = country.activity_tags || [];

      const sharedVibes = countryVibes.filter((v) =>
        sourceVibes.includes(v)
      ).length;
      const sharedActivities = countryActivities.filter((a) =>
        sourceActivities.includes(a)
      ).length;
      const sameRegion = country.region === sourceCountry.region ? 1 : 0;

      const similarityScore = sharedVibes * 2 + sharedActivities * 2 + sameRegion;

      return {
        ...country,
        similarityScore,
        sharedVibes: countryVibes.filter((v) => sourceVibes.includes(v)),
        sharedActivities: countryActivities.filter((a) =>
          sourceActivities.includes(a)
        ),
      };
    });

    // Sort by similarity score
    scoredCountries.sort((a, b) => b.similarityScore - a.similarityScore);

    res.json({
      success: true,
      sourceCountry: sourceCountry.country,
      recommendations: scoredCountries.slice(0, limit),
    });
  } catch (error) {
    console.error("Error finding similar countries:", error);
    res.status(500).json({
      error: "Failed to find similar countries",
      details: error.message,
    });
  }
});

/**
 * POST /api/recommendations/feedback
 * Record user feedback on recommendations
 * REQUIRES AUTHENTICATION
 */
router.post("/feedback", auth, async (req, res) => {
  try {
    const { countryName, liked, tags = [] } = req.body;
    const userId = req.userId; // From auth middleware

    if (!countryName || liked === undefined) {
      return res.status(400).json({ 
        error: "countryName and liked are required" 
      });
    }

    // Find or create user preferences
    let userPrefs = await UserPreferences.findOne({ userId });

    if (!userPrefs) {
      userPrefs = new UserPreferences({ userId });
    }

    // Update preferences based on feedback
    userPrefs.updateFromFeedback(countryName, liked, tags);
    await userPrefs.save();

    console.log(`📝 Feedback recorded for user ${userId}: ${countryName} - ${liked ? '👍' : '👎'}`);

    res.json({
      success: true,
      message: "Feedback recorded successfully",
      userId,
      countryName,
      liked,
    });
  } catch (error) {
    console.error("Error recording feedback:", error);
    res.status(500).json({ 
      error: "Failed to record feedback",
      details: error.message 
    });
  }
});

/**
 * GET /api/recommendations/stats
 * Get statistics about your countries database (public endpoint)
 */
router.get("/stats", async (req, res) => {
  try {
    const totalCountries = await Country.countDocuments();
    const countriesWithVibes = await Country.countDocuments({ 
      vibe_tags: { $exists: true, $ne: [] } 
    });
    const countriesWithActivities = await Country.countDocuments({ 
      activity_tags: { $exists: true, $ne: [] } 
    });

    // Get most common tags
    const vibeTagCounts = await Country.aggregate([
      { $unwind: "$vibe_tags" },
      { $group: { _id: "$vibe_tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const activityTagCounts = await Country.aggregate([
      { $unwind: "$activity_tags" },
      { $group: { _id: "$activity_tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      stats: {
        totalCountries,
        countriesWithVibes,
        countriesWithActivities,
        coverage: {
          vibes: Math.round((countriesWithVibes / totalCountries) * 100),
          activities: Math.round((countriesWithActivities / totalCountries) * 100),
        },
        topVibeTags: vibeTagCounts,
        topActivityTags: activityTagCounts,
      }
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;