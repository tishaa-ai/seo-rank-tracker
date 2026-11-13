# Rank Pilot: AI SEO Analyzer

A full-stack MERN web app that audits any website's SEO in seconds. You enter a URL, the server scrapes the page, and Google Gemini AI returns a structured report with scores, keyword insights and prioritized fixes.

---

## Features

- **AI-powered SEO audit**: Gemini analyzes the scraped page data and returns a structured JSON report
- **Scores at a glance**: an overall score plus 4 categories (SEO, Performance, Accessibility, Best Practices)
- **On-page checks**: title and meta description length, canonical, robots, Open Graph and Twitter tags, viewport, charset
- **Content structure**: H1–H6 heading counts, internal and external links, images missing alt text, word count, page size, load time
- **Keyword analysis**: top 10 keywords with count and density
- **Actionable issues**: 5–15 issues sorted by severity (critical → warning → info), each with a recommendation
- **History and dashboard**: every analysis is saved per user, with search, sort and delete
- **Secure authentication**: register and login with bcrypt-hashed passwords and JWT; protected routes on both client and server
- **Reliable AI calls**: up to 3 retries with exponential backoff on busy errors (503/429), automatic fallback to a second Gemini model, and a 60-second timeout
- **Polished UI**: responsive layout, dark/light mode, loading steps, empty states and toast notifications

---

## Tech Stack

| Layer    | Technologies                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Axios, React Hot Toast, Lucide Icons |
| Backend  | Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Cheerio                                    |
| AI       | Google Gemini API (@google/genai) with structured JSON output                                  |

---

## How It Works

```
User enters URL
      |
      v
React (Analyze page) --POST /api/analysis--> Express API (JWT verified)
                                                 |
                                                 |-- 1. Fetch the page (15s timeout)
                                                 |-- 2. Cheerio extracts meta tags, headings, links, images, text
                                                 |-- 3. Gemini returns scores, keywords & issues (JSON schema)
                                                 |-- 4. Result saved in MongoDB with the user's ID
                                                 |
React (Report page) <-------- analysis JSON -----+
```

1. **Auth**: on register or login, the password is hashed with bcrypt and the server returns a JWT. The client stores it, Axios attaches it to every request, and a 401 response logs the user out.
2. **Protected routes**: ProtectedRoute checks the user via /api/auth/me and redirects to the login page if there isn't one.
3. **Analysis**: the server scrapes the page, then sends the extracted data to Gemini with a fixed response schema, so the AI output is always valid, typed JSON.
4. **Storage**: each analysis is stored against the logged-in user, and users can only read or delete their own data.

---

## Project Structure

```
seo-rank-tracker/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # Navbar, ScoreGauge, IssueCard, ProtectedRoute, ...
│       ├── context/         # Auth and theme context
│       ├── pages/           # Home, Login, Dashboard, Analyze, Report, History
│       └── main.tsx
│
└── server/                  # Express backend
    └── src/
        ├── config/          # MongoDB connection
        ├── models/          # User, Analysis
        ├── routes/          # auth, analysis
        ├── services/        # scraper, gemini
        ├── middleware/      # JWT auth, error handling
        └── index.js
```

---

## API Endpoints

| Method | Endpoint           | Description                | Auth |
| ------ | ------------------ | -------------------------- | ---- |
| GET    | /api/health        | Server and database status | No   |
| POST   | /api/auth/register | Create an account          | No   |
| POST   | /api/auth/login    | Log in and receive a JWT   | No   |
| GET    | /api/auth/me       | Get the logged-in user     | Yes  |
| POST   | /api/analysis      | Analyze a URL              | Yes  |
| GET    | /api/analysis      | List the user's analyses   | Yes  |
| GET    | /api/analysis/:id  | Get one analysis report    | Yes  |
| DELETE | /api/analysis/:id  | Delete an analysis         | Yes  |

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- MongoDB (local install or a free MongoDB Atlas cluster)
- A Gemini API key from Google AI Studio (https://aistudio.google.com/apikey)

### 1. Clone the repository

```
git clone https://github.com/<your-username>/seo-rank-tracker.git
cd seo-rank-tracker
```

### 2. Set up the backend

```
cd server
npm install
```

Create server/.env from server/.env.example:

| Variable              | Description                                        |
| --------------------- | -------------------------------------------------- |
| PORT                  | Server port (e.g. 5000)                            |
| MONGODB_URI           | MongoDB connection string                          |
| JWT_SECRET            | A long random string used to sign tokens           |
| GEMINI_API_KEY        | Your Gemini API key                                |
| GEMINI_MODEL          | Primary Gemini model                               |
| GEMINI_FALLBACK_MODEL | Model used when the primary one is busy            |
| CLIENT_URL            | Frontend URL for CORS (e.g. http://localhost:5173) |

```
npm run dev
```

Open http://localhost:5000/api/health. It should report the database as connected.

### 3. Set up the frontend

```
cd ../client
npm install
```

Create client/.env from client/.env.example and set VITE_API_URL to your backend URL.

```
npm run dev
```

Open http://localhost:5173.

---

## Challenges & Learnings

- **Getting reliable JSON from an LLM**: I used Gemini's structured output (responseSchema) with temperature 0, so the response always matches the database model.
- **AI service overload (HTTP 503)**: I added retry with exponential backoff plus a fallback model, so the analysis still completes when the primary model is busy.
- **Hanging AI requests**: I added a 60-second timeout, so the user always gets a clear message instead of an endless loader.
- **Unreliable websites**: timeouts, blocked requests and invalid or localhost URLs are validated and return clear error messages instead of crashing the server.
- **Windows .env encoding bug**: PowerShell added a byte-order mark (BOM) to .env, which broke the first environment variable. I fixed it by saving the file as UTF-8 without BOM.

---

## Known Limitations

- Pages are scraped with a plain HTTP fetch and Cheerio, so JavaScript-heavy single-page apps may return limited content.
- Performance and accessibility scores are AI estimates based on the scraped data, not real Lighthouse measurements.

---

## Roadmap

- [ ] Keyword Rank Tracker: track a site's Google position for chosen keywords over time
- [ ] Real performance metrics via the Google PageSpeed Insights API
- [ ] Download reports as PDF
- [ ] Deploy (Vercel + Render)

---

## Author

**Tisha Bagde**

- GitHub: https://github.com/https://github.com/tishaa-ai
- LinkedIn: https://linkedin.com/in/https://www.linkedin.com/in/tisha-bagde/
