import express from "express";
import Country from "../models/Country.js";
import Visited from "../models/Visited.js";
import Wishlist from "../models/Wishlist.js";
import UserPreferences from "../models/UserPreferences.js";
import { auth, optionalAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * AI-ENHANCED RECOMMENDATION ENGINE
 * Uses user feedback and preferences to personalize recommendations
 * NOW WITH PROPER AUTHENTICATION
 */

/**
 * Calculate personalized match score using AI/ML techniques
 */
async function calculateAIMatchScore(country, vibes, activities, filters, userPrefs) {
  let score = 0;
  let maxScore = 0;

  // 1. Base matching (30% weight) - reduced from 80%
  const vibeWeight = 15;
  const activityWeight = 15;
  
  if (vibes.length > 0) {
    const countryVibes = country.vibe_tags || [];
    const vibeMatches = vibes.filter((v) => countryVibes.includes(v)).length;
    score += (vibeMatches / vibes.length) * vibeWeight;
    maxScore += vibeWeight;
  }

  if (activities.length > 0) {
    const countryActivities = country.activity_tags || [];
    const activityMatches = activities.filter((a) =>
      countryActivities.includes(a)
    ).length;
    score += (activityMatches / activities.length) * activityWeight;
    maxScore += activityWeight;
  }

  // 2. AI COMPONENT: User preference alignment (40% weight)
  if (userPrefs) {
    const prefWeight = 40;
    let prefScore = 0;

    // Check if country tags align with user's historical preferences
    const countryVibes = country.vibe_tags || [];
    const countryActivities = country.activity_tags || [];
    
    const preferredVibes = userPrefs.preferredVibes || [];
    const preferredActivities = userPrefs.preferredActivities || [];

    if (preferredVibes.length > 0) {
      const matchingPreferredVibes = countryVibes.filter(v => 
        preferredVibes.includes(v)
      ).length;
      prefScore += (matchingPreferredVibes / Math.max(preferredVibes.length, 1)) * 0.5;
    }

    if (preferredActivities.length > 0) {
      const matchingPreferredActivities = countryActivities.filter(a => 
        preferredActivities.includes(a)
      ).length;
      prefScore += (matchingPreferredActivities / Math.max(preferredActivities.length, 1)) * 0.5;
    }

    score += prefScore * prefWeight;
    maxScore += prefWeight;
  } else {
    maxScore += 40; // Still count in maxScore even if no preferences
  }

  // 3. AI COMPONENT: Positive feedback boost (15% weight)
  if (userPrefs && userPrefs.likedCountries) {
    const feedbackWeight = 15;
    let feedbackScore = 0;

    // Find similar countries to ones user liked
    const likedCountryNames = userPrefs.likedCountries.map(lc => lc.countryName);
    
    // If this country shares tags with liked countries, boost score
    for (const likedName of likedCountryNames) {
      const likedCountry = await Country.findOne({ country: likedName }).lean();
      if (likedCountry) {
        const sharedVibes = (country.vibe_tags || []).filter(v => 
          (likedCountry.vibe_tags || []).includes(v)
        ).length;
        const sharedActivities = (country.activity_tags || []).filter(a => 
          (likedCountry.activity_tags || []).includes(a)
        ).length;
        
        if (sharedVibes + sharedActivities > 0) {
          feedbackScore = Math.min(1, feedbackScore + 0.2); // Incremental boost
        }
      }
    }

    score += feedbackScore * feedbackWeight;
    maxScore += feedbackWeight;
  } else {
    maxScore += 15;
  }

  // 4. Diversity bonus (5% weight) - prevent filter bubble
  const diversityWeight = 5;
  const countryVibes = country.vibe_tags || [];
  const countryActivities = country.activity_tags || [];
  
  // Reward countries with tags user hasn't explored much
  let diversityScore = 0;
  if (userPrefs && userPrefs.preferredVibes) {
    const unexploredVibes = countryVibes.filter(v => 
      !userPrefs.preferredVibes.includes(v)
    ).length;
    diversityScore = Math.min(1, unexploredVibes / 3); // Bonus for new experiences
  }
  
  score += diversityScore * diversityWeight;
  maxScore += diversityWeight;

  // 5. Traditional filters (10% weight)
  if (filters.region && country.region === filters.region) {
    score += 5;
  }
  if (filters.budget && country.budgetLevel === filters.budget) {
    score += 5;
  }
  maxScore += 10;

  // Normalize to 0-100 scale
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

/**
 * POST /api/ai-recommendations
 * Get AI-powered personalized recommendations
 * REQUIRES AUTHENTICATION
 */
router.post("/", auth, async (req, res) => {
  try {
    const {
      vibes = [],
      activities = [],
      filters = {},
      limit = 12,
    } = req.body;

    // Use authenticated user ID
    const userId = req.userId;

    // Validate input
    if (vibes.length === 0 && activities.length === 0) {
      return res.status(400).json({
        error: "Please select at least one vibe or activity preference",
      });
    }

    // Load user preferences for AI personalization
    const userPrefs = await UserPreferences.findOne({ userId });

    console.log(`🤖 AI Recommendations for user: ${userId}`);
    console.log(`🤖 AI Mode: ${userPrefs ? 'Personalized' : 'Cold Start'}`);
    if (userPrefs) {
      console.log(`   - Preferred vibes: ${userPrefs.preferredVibes.length}`);
      console.log(`   - Liked countries: ${userPrefs.likedCountries.length}`);
    }

    // Build base query
    const query = {
      $or: [
        { vibe_tags: { $in: vibes } },
        { activity_tags: { $in: activities } },
      ],
    };

    // Apply filters
    if (filters.region) query.region = filters.region;
    if (filters.climate) query.climate = filters.climate;
    if (filters.budget) query.budgetLevel = filters.budget;

    // Fetch matching countries
    let countries = await Country.find(query).lean();

    // Filter out visited/wishlisted
    let visitedCodes = [];
    let wishlistCodes = [];

    if (filters.excludeVisited) {
      const visited = await Visited.find({ userId }).select("countryCode").lean();
      visitedCodes = visited.map((v) => v.countryCode);
    }

    if (filters.excludeWishlisted) {
      const wishlist = await Wishlist.find({ userId }).select("countryCode").lean();
      wishlistCodes = wishlist.map((w) => w.countryCode);
    }

    countries = countries.filter(
      (c) => !visitedCodes.includes(c.country) && !wishlistCodes.includes(c.country)
    );

    // Calculate AI-enhanced match scores
    const scoredCountries = await Promise.all(
      countries.map(async (country) => {
        const matchScore = await calculateAIMatchScore(
          country, 
          vibes, 
          activities, 
          filters, 
          userPrefs
        );

        const reason = generateAIReason(country, vibes, activities, userPrefs);

        const countryVibes = country.vibe_tags || [];
        const countryActivities = country.activity_tags || [];

        return {
          ...country,
          matchScore,
          reason,
          matchedVibes: vibes.filter((v) => countryVibes.includes(v)),
          matchedActivities: activities.filter((a) => countryActivities.includes(a)),
          isPersonalized: !!userPrefs,
        };
      })
    );

    // Sort by AI score
    scoredCountries.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });

    // Return recommendations
    const recommendations = scoredCountries.slice(0, limit);

    console.log(`✅ Returning ${recommendations.length} recommendations for ${userId}`);

    res.json({
      success: true,
      count: recommendations.length,
      totalMatches: countries.length,
      aiMode: userPrefs ? "personalized" : "cold_start",
      query: { vibes, activities, filters },
      recommendations,
    });
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    res.status(500).json({
      error: "Failed to generate recommendations",
      details: error.message,
    });
  }
});

/**
 * Generate AI-powered explanation
 */
function generateAIReason(country, vibes, activities, userPrefs) {
  const reasons = [];

  // Tag matches
  const countryVibes = country.vibe_tags || [];
  const countryActivities = country.activity_tags || [];
  
  const vibeMatches = vibes.filter((v) => countryVibes.includes(v));
  const activityMatches = activities.filter((a) => countryActivities.includes(a));

  if (vibeMatches.length > 0) {
    reasons.push(`${vibeMatches.join(", ")} vibes`);
  }

  if (activityMatches.length > 0) {
    reasons.push(`${activityMatches.join(", ")}`);
  }

  // AI personalization reasons
  if (userPrefs) {
    const preferredVibes = userPrefs.preferredVibes || [];
    const preferredActivities = userPrefs.preferredActivities || [];

    const matchingPreferredVibes = countryVibes.filter(v => preferredVibes.includes(v));
    const matchingPreferredActivities = countryActivities.filter(a => preferredActivities.includes(a));

    if (matchingPreferredVibes.length > 0) {
      reasons.push(`✨ Matches your taste (${matchingPreferredVibes.slice(0, 2).join(", ")})`);
    }

    // Check if similar to liked countries
    if (userPrefs.likedCountries && userPrefs.likedCountries.length > 0) {
      reasons.push(`💡 Similar to places you liked`);
    }
  }

  return reasons.length > 0
    ? reasons.join(" • ")
    : "Recommended for you";
}

/**
 * POST /api/ai-recommendations/learn
 * Update user preferences based on interaction (implicit feedback)
 * REQUIRES AUTHENTICATION
 */
router.post("/learn", auth, async (req, res) => {
  try {
    const { action, countryName, tags } = req.body;
    const userId = req.userId; // Use authenticated user ID

    // Actions: "view", "wishlist", "explore", "feedback"
    let userPrefs = await UserPreferences.findOne({ userId });

    if (!userPrefs) {
      userPrefs = new UserPreferences({ userId });
    }

    // Implicit learning from actions
    if (action === "view" || action === "explore" || action === "wishlist") {
      // User is interested - boost these tags
      tags.forEach(tag => {
        if (!userPrefs.preferredVibes.includes(tag)) {
          userPrefs.preferredVibes.push(tag);
        }
      });
    }

    await userPrefs.save();

    console.log(`📚 Learning from ${action} for user ${userId}: ${countryName}`);

    res.json({
      success: true,
      message: "Preferences updated",
      action,
    });
  } catch (error) {
    console.error("Error learning from interaction:", error);
    res.status(500).json({ error: "Failed to learn from interaction" });
  }
});

export default router;