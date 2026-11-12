Build a SIMPLE version of GreatStack's "AI SEO Rank Tracker" tutorial project (https://youtu.be/XGVHqv8Hof0) in this VS Code workspace. You can't watch the video, so use the starter repo https://github.com/GreatStackDev/seo-rank-tracker (React + Vite + TypeScript + Tailwind frontend with dummy data) and this spec.

## Scope (keep it simple)

Version 1 has only ONE feature: the SEO Analyzer.
User logs in → enters a website URL → backend downloads the page → extracts SEO data → Gemini returns scores, keywords, issues and fixes → saved in MongoDB → shown on the Report page and in History.

NOT in this version: Rank Tracker, Browserbase, Google scraping, cron jobs, payments, plan limits. On the Rank Tracker pages show a clean "Coming soon" card.

## Structure

/client → clone the starter repo here and keep its design
/server → Node.js + Express in plain JavaScript (ES modules)

## Backend

- Packages: express, mongoose, bcryptjs, jsonwebtoken, cors, dotenv, cheerio, @google/genai
- Models: User (name, email, hashed password) and Analysis, using exactly the field names from dummyWebsiteAnalysis in client/src/assets/assets.tsx
- Routes:
  POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
  POST /api/analysis {url} → fetch page, extract data, call Gemini, save, return the full analysis (one simple request, no background jobs)
  GET /api/analysis (history), GET /api/analysis/:id, DELETE /api/analysis/:id
- Scraping: Node's built-in fetch with a 15-second timeout + cheerio. Measure load time, status code, page size, word count, meta tags, headings, links, images with/without alt, and the first 3000 chars of text, matching the scrapedData shape in client/src/assets/gemini-assets.ts.
- Gemini: reuse the schema and prompt from gemini-assets.ts with structured JSON output, temperature 0, model name from env GEMINI_MODEL (use a current Flash model from the official docs).
- If a site blocks us or times out, return a clear error message instead of crashing.
- .env + .env.example: MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, GEMINI_MODEL, CLIENT_URL, PORT. Never commit secrets.

## Frontend

- Replace all dummy data with real API calls (axios with VITE_API_URL, token in localStorage, logout on 401)
- Login/Register working, ProtectedRoute actually protecting pages
- Analyze page: show a loading state while the request runs (it can take 10–20 seconds), then open the Report page
- Dashboard shows recent analyses; History shows all analyses with delete
- Keep the existing design; just add loading, empty and error states (react-hot-toast)

## How to work

Work in 4 phases and STOP after each one, telling me exactly how to test it:

1. Setup: clone client, create server, connect MongoDB, /api/health
2. Auth: register/login/logout end to end
3. Analyzer: scrape + Gemini + Analyze, Report, Dashboard and History pages
4. Polish + README + simple deploy steps (frontend on Vercel, backend on Render)
   After each phase: run the client build and fix all errors, commit to git, and explain the flow in 4–5 simple lines so I can explain it in interviews. Ask me if anything is unclear instead of guessing.
