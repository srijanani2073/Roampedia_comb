import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    
    // ✅ Email as foreign key to link with Users collection
    userEmail: { type: String, required: true, index: true },
    
    // Country details
    countryCode: { type: String, required: true },
    countryName: { type: String },
    region: { type: String },
    flagUrl: { type: String },
    addedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, countryCode: 1 }, { unique: true });
wishlistSchema.index({ userEmail: 1 }); // ✅ Index for email-based joins

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;