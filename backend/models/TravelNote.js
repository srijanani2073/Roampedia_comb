import mongoose from "mongoose";

const travelNoteSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // ✅ Email as foreign key to link with Users collection
  userEmail: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  countryName: { type: String, required: true },
  countryCode: { type: String, required: true },
  notes: { type: String, default: "" },
  priority: { type: String, default: "" },
  flagUrl: { type: String },
  region: { type: String },
}, { timestamps: true });

// ✅ Index for efficient queries
travelNoteSchema.index({ userId: 1, countryCode: 1 });
travelNoteSchema.index({ userEmail: 1 }); // ✅ Index for email-based joins

const TravelNote = mongoose.model("TravelNote", travelNoteSchema);
export default TravelNote;