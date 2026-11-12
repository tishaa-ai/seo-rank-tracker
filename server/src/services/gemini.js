import { GoogleGenAI, Type } from "@google/genai";
import AppError from "../utils/AppError.js";

// Response schema for structured SEO analysis (from client/src/assets/gemini-assets.ts)
const seoAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.INTEGER },
        categories: {
            type: Type.OBJECT,
            properties: {
                seo: { type: Type.INTEGER },
                performance: { type: Type.INTEGER },
                accessibility: { type: Type.INTEGER },
                bestPractices: { type: Type.INTEGER },
            },
            required: ["seo", "performance", "accessibility", "bestPractices"],
        },
        keywords: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    count: { type: Type.INTEGER },
                    density: { type: Type.NUMBER },
                },
                required: ["word", "count", "density"],
            },
        },
        issues: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    severity: { type: Type.STRING, format: "enum", enum: ["critical", "warning", "info"] },
                    category: { type: Type.STRING },
                    message: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                },
                required: ["severity", "category", "message", "recommendation"],
            },
        },
    },
    required: ["overallScore", "categories", "keywords", "issues"],
};

// Prompt for getting SEO Analysis structured data from AI (from client/src/assets/gemini-assets.ts)
const buildPrompt = (scrapedData) => `You are an expert SEO analyst. Analyze the following website data and provide a comprehensive SEO audit.

Website URL: ${scrapedData.url}
Load Time: ${scrapedData.loadTime}ms
Status Code: ${scrapedData.statusCode}
Page Size: ${Math.round(scrapedData.pageSize / 1024)}KB
Word Count: ${scrapedData.wordCount}

META DATA:
- Title: "${scrapedData.metaData.title}" (${scrapedData.metaData.title.length} chars)
- Description: "${scrapedData.metaData.description}" (${scrapedData.metaData.description.length} chars)
- Canonical: "${scrapedData.metaData.canonical}"
- Robots: "${scrapedData.metaData.robots}"
- OG Title: "${scrapedData.metaData.ogTitle}"
- OG Description: "${scrapedData.metaData.ogDescription}"
- OG Image: "${scrapedData.metaData.ogImage}"
- Twitter Card: "${scrapedData.metaData.twitterCard}"
- Viewport: "${scrapedData.metaData.viewport}"
- Charset: "${scrapedData.metaData.charset}"

HEADINGS:
- H1: ${scrapedData.headings.h1} (texts: ${JSON.stringify(scrapedData.headings.h1Texts)})
- H2: ${scrapedData.headings.h2}
- H3: ${scrapedData.headings.h3}
- H4: ${scrapedData.headings.h4}
- H5: ${scrapedData.headings.h5}
- H6: ${scrapedData.headings.h6}

LINKS:
- Internal: ${scrapedData.links.internal}
- External: ${scrapedData.links.external}
- Total: ${scrapedData.links.total}

IMAGES:
- Total: ${scrapedData.images.total}
- Missing Alt Text: ${scrapedData.images.missingAlt}
- With Alt Text: ${scrapedData.images.withAlt}

PAGE CONTENT (first 3000 chars):
${scrapedData.bodyText}

Scoring guidelines:
- Title: 50-60 chars optimal, must exist
- Description: 150-160 chars optimal, must exist
- H1: exactly 1 is ideal
- Images: all should have alt text
- Load time: <3s good, <5s ok, >5s poor
- Page size: <3MB good
- Must have viewport meta, charset, canonical
- OG tags and Twitter cards are important
- Internal linking is good for SEO
- Word count: >300 words for content pages
- Check heading hierarchy

Severity levels must be exactly one of: "critical", "warning", or "info".
Provide 5-15 issues sorted by severity (critical first). Be specific and actionable with recommendations.
Extract top 10 keywords by frequency from the page content.`;

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TIMEOUT_MS = 60000; // per Gemini call
const MAX_RETRIES = 3; // retries after the first attempt, per model
const RETRYABLE_STATUS = new Set([429, 503]); // rate limited / "model is experiencing high demand"

// 429 and 503 are temporary on Google's side, so they are worth retrying
export function isRetryable(err) {
    if (RETRYABLE_STATUS.has(err?.status)) return true;
    return /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded/i.test(err?.message || "");
}

// One Gemini request that gives up after TIMEOUT_MS
async function generateOnce(ai, model, prompt, timeoutMs) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(Object.assign(new Error(`Gemini (${model}) timed out after ${timeoutMs / 1000}s`), { isTimeout: true }));
        }, timeoutMs);
    });

    try {
        const request = ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: seoAnalysisSchema,
                temperature: 0,
                abortSignal: controller.signal,
            },
        });
        const response = await Promise.race([request, timeout]);
        return response.text;
    } finally {
        clearTimeout(timer);
    }
}

// Retries 429/503 with exponential backoff: waits ~1s, 2s, 4s between attempts
async function generateWithRetry(ai, model, prompt, { retries, baseDelayMs, timeoutMs }) {
    for (let attempt = 0; ; attempt++) {
        try {
            return await generateOnce(ai, model, prompt, timeoutMs);
        } catch (err) {
            if (!isRetryable(err) || attempt >= retries) throw err;
            const delay = Math.round(baseDelayMs * 2 ** attempt * (1 + Math.random() * 0.25)); // +0-25% jitter
            console.warn(`Gemini ${model} busy (${err.status || err.message}). Retry ${attempt + 1}/${retries} in ${delay}ms`);
            await sleep(delay);
        }
    }
}

// Tries the main model (with retries), then the fallback model if Gemini is still busy.
// Exported with injectable options so it can be tested without a real API key.
export async function generateWithFallback(ai, prompt, opts = {}) {
    const {
        model = process.env.GEMINI_MODEL || "gemini-3.8-flash",
        fallbackModel = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash",
        retries = MAX_RETRIES,
        baseDelayMs = 1000,
        timeoutMs = TIMEOUT_MS,
    } = opts;
    const settings = { retries, baseDelayMs, timeoutMs };

    try {
        return await generateWithRetry(ai, model, prompt, settings);
    } catch (err) {
        if (!isRetryable(err) || !fallbackModel || fallbackModel === model) throw err;
        console.warn(`Gemini ${model} still busy after ${retries} retries. Falling back to ${fallbackModel}`);
        return await generateWithRetry(ai, fallbackModel, prompt, settings);
    }
}

// Sends scraped data to Gemini and returns { overallScore, categories, keywords, issues }
export async function analyzeWithGemini(scrapedData) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-gemini-api-key") {
        throw new AppError("GEMINI_API_KEY is not set on the server.", 500);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let text;
    try {
        text = await generateWithFallback(ai, buildPrompt(scrapedData));
    } catch (err) {
        console.error("Gemini error:", err.status || "", err.message);
        if (err.isTimeout) throw new AppError("The AI analysis took longer than 60 seconds. Please try again.", 504);
        if (isRetryable(err)) throw new AppError("Gemini is under high demand right now. Please try again in a minute.", 503);
        throw new AppError("AI analysis failed. Please try again in a moment.", 502);
    }

    let result;
    try {
        result = JSON.parse(text);
    } catch {
        throw new AppError("The AI returned an unreadable response. Please try again.", 502);
    }

    const order = { critical: 0, warning: 1, info: 2 };
    return {
        overallScore: clamp(result.overallScore),
        categories: {
            seo: clamp(result.categories?.seo),
            performance: clamp(result.categories?.performance),
            accessibility: clamp(result.categories?.accessibility),
            bestPractices: clamp(result.categories?.bestPractices),
        },
        keywords: (result.keywords || []).slice(0, 10),
        issues: (result.issues || []).filter((i) => i.severity in order).sort((a, b) => order[a.severity] - order[b.severity]),
    };
}
