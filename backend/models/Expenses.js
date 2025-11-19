import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // For faster queries by user
    },
    category: { 
      type: String, 
      required: true 
    },
    budget: { 
      type: Number, 
      default: 0 
    },
    actual: { 
      type: Number, 
      default: 0 
    },
    // Optional: Add trip/itinerary reference if expenses are trip-specific
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip", // If you have a Trip model
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index for efficient user + category queries
expenseSchema.index({ userId: 1, category: 1 });

const Expense = mongoose.model("Expense", expenseSchema);
export default Expense;