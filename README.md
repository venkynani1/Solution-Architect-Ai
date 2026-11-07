# Solution Architect AI

Paste a business problem statement → get the best solution approach, powered by ChatGPT (OpenAI API):
problem analysis, recommended approach, architecture, tech stack with trend signals, alternatives,
roadmap, risks, KPIs, effort and a pitch line. Optional live web search keeps "trending tech" current.

## Run locally
```bash
npm install
cp .env.example .env.local   # add your OpenAI key
npm run dev                  # http://localhost:3000
```

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. Import it in Vercel.
3. Add env var `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`).
4. Deploy.

## Notes
- The API key stays on the server (`app/api/solve/route.js`); it is never sent to the browser.
- Uses the OpenAI Responses API with the `web_search` tool. If your model/account doesn't support
  web search, it automatically falls back to plain generation.
- Change the model with `OPENAI_MODEL` (default `gpt-5.6`). A cheaper model works too.
- Edit the output format / rules in `lib/prompt.js`.
- Last 10 results are kept in the browser (localStorage). "Copy as Markdown" exports a result.
