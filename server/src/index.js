import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import analysisRoutes from "./routes/analysis.js";

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set. Copy .env.example to .env and fill it in.");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Health check: tells you the server is up and whether MongoDB is connected
app.get("/api/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.json({ status: "ok", database: dbConnected ? "connected" : "disconnected" });
});

app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);

// Unknown routes
app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler so one bad request never crashes the server
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err); // 4xx are normal user mistakes, no stack trace needed
    res.status(status).json({ message: status >= 500 && !err.status ? "Something went wrong" : err.message });
});

await connectDB();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
