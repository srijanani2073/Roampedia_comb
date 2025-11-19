import mongoose from "mongoose";

const UserExperienceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    
    // ✅ Email as foreign key to link with Users collection
    userEmail: { type: String, required: true, index: true },
    
    // Experience details
    country: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    themes: {
      type: [String],
      required: true,
      validate: [
        (arr) => arr.length >= 1 && arr.length <= 2,
        "Select at least 1 and at most 2 themes.",
      ],
    },
    rating: {
      type: Number,
      min: 1,
      max: 10,
      required: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Indexes for queries and joins
UserExperienceSchema.index({ userId: 1, country: 1 });
UserExperienceSchema.index({ userEmail: 1 }); // ✅ Index for email-based joins
UserExperienceSchema.index({ themes: 1 }); // For theme-based reports

const UserExperience = mongoose.model("UserExperience", UserExperienceSchema);

export default UserExperience;