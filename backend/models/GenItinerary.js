import mongoose from "mongoose";

const genItinerarySchema = new mongoose.Schema(
  {
    homeCountry: String,
    destination: String,
    departureDate: String,
    returnDate: String,
    adults: Number,
    children: Number,
    infants: Number,
    budgetMin: Number,
    budgetMax: Number,
    currency: String,
  },
  { timestamps: true }
);

export default mongoose.model("GenItinerary", genItinerarySchema);