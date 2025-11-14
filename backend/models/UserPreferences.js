import mongoose from "mongoose";

/**
 * UserPreferences Model - Updated for Authentication
 * Now links to User model instead of using string userId
 */

const userPreferencesSchema = new mongoose.Schema(
  {
    // Link to User model
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One preferences document per user
    },
    
    // Legacy support: keep userId as string for backwards compatibility
    userId: {
      type: String,
      index: true,
    },
    
    // Preferred vibe tags based on feedback
    preferredVibes: {
      type: [String],
      default: [],
    },
    
    // Preferred activity tags based on feedback
    preferredActivities: {
      type: [String],
      default: [],
    },
    
    // Countries the user liked
    likedCountries: [
      {
        countryName: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    
    // Countries the user disliked
    dislikedCountries: [
      {
        countryName: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    
    // Feedback history
    feedbackHistory: [
      {
        countryName: String,
        liked: Boolean,
        tags: [String],
        timestamp: { type: Date, default: Date.now },
      },
    ],
    
    // Preferred regions
    preferredRegions: {
      type: [String],
      default: [],
    },
    
    // Budget preference
    budgetPreference: {
      type: String,
      enum: ["Budget", "Mid-range", "Luxury", "Mixed"],
    },
    
    // Last recommendation query
    lastQuery: {
      vibes: [String],
      activities: [String],
      filters: mongoose.Schema.Types.Mixed,
      timestamp: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
userPreferencesSchema.index({ user: 1, userId: 1 });

// Method to update preferences based on feedback
userPreferencesSchema.methods.updateFromFeedback = function (
  countryName,
  liked,
  tags
) {
  // Add to liked or disliked list
  if (liked) {
    this.likedCountries.push({ countryName });
    // Update preferred tags
    tags.forEach((tag) => {
      if (!this.preferredVibes.includes(tag) && !this.preferredActivities.includes(tag)) {
        this.preferredVibes.push(tag);
      }
    });
  } else {
    this.dislikedCountries.push({ countryName });
  }

  // Add to feedback history
  this.feedbackHistory.push({ countryName, liked, tags });

  // Keep only last 50 feedback items
  if (this.feedbackHistory.length > 50) {
    this.feedbackHistory = this.feedbackHistory.slice(-50);
  }

  return this;
};

/**
 * Static method to find or create preferences for a user
 */
userPreferencesSchema.statics.findOrCreateForUser = async function (userId) {
  let preferences = await this.findOne({ 
    $or: [
      { user: userId },
      { userId: userId } // Backwards compatibility
    ]
  });

  if (!preferences) {
    preferences = new this({
      user: userId,
      userId: userId.toString(),
    });
    await preferences.save();
  }

  return preferences;
};

const UserPreferences = mongoose.model("UserPreferences", userPreferencesSchema);

export default UserPreferences;