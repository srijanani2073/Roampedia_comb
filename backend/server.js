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

dotenv.config();

const app = express();

// === Environment Variables ===
const PORT = process.env.PORT || 5050;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://<username>:<password>@cluster.mongodb.net/roampedia?retryWrites=true&w=majority";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// === Middleware ===
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
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
app.use("/api", listsRouter);
app.use("/api/travelnotes", travelNotesRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/recommendations", recommendationRoutes); // ← NEW LINE
app.use("/api/ai-recommendations", aiRecommendationRoutes);

// === Health Check ===
app.get("/", (req, res) =>
  res.json({ ok: true, service: "roampedia-backend" })
);

// === Error Handler ===
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});