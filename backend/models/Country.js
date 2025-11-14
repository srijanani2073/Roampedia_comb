import mongoose from "mongoose";

/**
 * Country Model - Matches your existing MongoDB schema
 * This file is for reference and to ensure type consistency
 * Your existing countries collection already has this structure
 */

const countrySchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    capital: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      trim: true,
    },
    // Vibe tags - emotional/atmospheric descriptors
    vibe_tags: {
      type: [String],
      default: [],
    },
    // Activity tags - things to do
    activity_tags: {
      type: [String],
      default: [],
    },
    // Optional fields that may or may not exist in your DB
    region: String,
    subregion: String,
    climate: String,
    bestSeason: String,
    description: String,
    imageUrl: String,
    flagUrl: String,
    popularityScore: {
      type: Number,
      default: 0,
    },
    budgetLevel: String,
    languages: [String],
  },
  {
    timestamps: true,
    collection: "countries_rengine", // Make sure this matches your collection name
  }
);

// Indexes for efficient querying
countrySchema.index({ vibe_tags: 1 });
countrySchema.index({ activity_tags: 1 });
countrySchema.index({ country: 1 });

const Country = mongoose.model("Country", countrySchema);

export default Country;