import mongoose from "mongoose";

const attractionSchema = new mongoose.Schema(
  {
    site_name: { type: String, required: true },
    country: { type: String },
    country_iso: { type: String, index: true },
    category: { type: String },
    year_inscribed: { type: Number },
    lat: { type: Number },
    lon: { type: Number }
  },
  { timestamps: true }
);

export default mongoose.model("Attraction", attractionSchema);
