import { Router } from "express";
import mongoose from "mongoose";
import Analysis from "../models/Analysis.js";
import protect from "../middleware/auth.js";
import AppError from "../utils/AppError.js";
import { normalizeUrl, scrapeWebsite } from "../services/scraper.js";
import { analyzeWithGemini } from "../services/gemini.js";

const router = Router();
router.use(protect); // every analysis route needs a logged-in user

// Finds an analysis that belongs to the current user, or throws 404
async function findOwn(req) {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Analysis not found", 404);
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user._id });
    if (!analysis) throw new AppError("Analysis not found", 404);
    return analysis;
}

// POST /api/analysis  { url }  -> scrape, ask Gemini, save, return the full analysis
router.post("/", async (req, res) => {
    const url = normalizeUrl(req.body?.url);
    const { bodyText, statusCode, ...scraped } = await scrapeWebsite(url);
    const ai = await analyzeWithGemini({ ...scraped, bodyText, statusCode });

    const analysis = await Analysis.create({ userId: req.user._id, ...scraped, ...ai, status: "completed" });
    res.status(201).json({ analysis });
});

// GET /api/analysis  -> history (newest first, without the heavy fields)
router.get("/", async (req, res) => {
    const analyses = await Analysis.find({ userId: req.user._id }).sort({ createdAt: -1 }).select("-keywords -issues");
    res.json({ analyses });
});

// GET /api/analysis/:id
router.get("/:id", async (req, res) => {
    res.json({ analysis: await findOwn(req) });
});

// DELETE /api/analysis/:id
router.delete("/:id", async (req, res) => {
    const analysis = await findOwn(req);
    await analysis.deleteOne();
    res.json({ message: "Analysis deleted" });
});

export default router;
