# Solution Architect AI

Paste a business problem statement → get the best solution approach: problem analysis, recommended
approach, architecture, tech stack with trend signals, alternatives, roadmap, risks, KPIs, effort and
a pitch line. Optional live web search keeps "trending tech" current.

Runs **free on Groq** (`openai/gpt-oss-120b`, with built-in browser search), or on OpenAI if you prefer.

## Get a free Groq key
1. Sign in at https://console.groq.com (Google/GitHub login, no card).
2. Go to **API Keys** → **Create API Key** → copy it.

## Run locally
```bash
npm install
cp .env.example .env.local   # paste GROQ_API_KEY
npm run dev                  # http://localhost:3000
```

## Deploy to Vercel
1. Import this repo in Vercel.
2. Add env var `GROQ_API_KEY` (optionally `GROQ_MODEL`).
3. Deploy.

## Notes
- Provider: Groq is used when `GROQ_API_KEY` is set; otherwise `OPENAI_API_KEY` (paid) is used.
- API keys stay on the server (`app/api/solve/route.js`); never commit them.
- If web search isn't available, the app falls back to plain generation automatically.
- Free-tier rate limits apply; a "rate limit" message means wait a minute.
- Edit the output format / rules in `lib/prompt.js`.
