import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import listsRouter from "./routes/lists.js";
import travelNotesRoutes from "./routes/travelNotesRoutes.js";
import experienceRoutes from "./routes/experienceRoutes.js";
import expensesRoutes from "./routes/expensesRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import aiRecommendationRoutes from "./routes/aiRecommendationRoutes.js";
import authRoutes from "./routes/authRoutes.js"; // NEW

dotenv.config();

const app = express();

// === Environment Variables ===
const PORT = process.env.PORT || 5050;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://<username>:<password>@cluster.mongodb.net/roampedia?retryWrites=true&w=majority";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET; // NEW - REQUIRED!

// Validate required environment variables
if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is required in .env file");
  console.error("   Add this line to your .env:");
  console.error("   JWT_SECRET=your-super-secret-key-here");
  process.exit(1);
}

// === Middleware ===
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    exposedHeaders: ["Authorization"], // Allow frontend to read auth header
  })
);
app.use(express.json({ limit: "10mb" })); // Increased for profile pictures
app.use(morgan("dev"));

// === MongoDB Connection ===
mongoose
  .connect(MONGODB_URI, {
    dbName: "roampedia",
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// === Routes ===
// Authentication routes (public)
app.use("/api/auth", authRoutes); // NEW - Authentication endpoints

// Existing routes
app.use("/api", listsRouter);
app.use("/api/travelnotes", travelNotesRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/ai-recommendations", aiRecommendationRoutes);

// === Health Check ===
app.get("/", (req, res) =>
  res.json({ 
    ok: true, 
    service: "roampedia-backend",
    auth: "enabled",
    version: "2.0.0"
  })
);

// === Error Handler ===
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Authentication: ${JWT_SECRET ? 'Enabled' : 'Disabled'}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`🌐 CORS: ${CORS_ORIGIN}`);
});