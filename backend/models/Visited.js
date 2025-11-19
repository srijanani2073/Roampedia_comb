import mongoose from "mongoose";

const visitedSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    
    // ✅ Email as foreign key to link with Users collection
    userEmail: { type: String, required: true, index: true },
    
    // Country details
    countryCode: { type: String, required: true },
    countryName: { type: String },
    region: { type: String },
    flagUrl: { type: String },
    dateVisited: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

visitedSchema.index({ userId: 1, countryCode: 1 }, { unique: true });
visitedSchema.index({ userEmail: 1 }); // ✅ Index for email-based joins

const Visited = mongoose.model("Visited", visitedSchema);
export default Visited;