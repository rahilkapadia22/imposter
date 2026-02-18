# Imposter Word Game (Vercel + Gemini Flash Lite)

This project has:
- `/index.html`: setup page (players 1-10, imposter min/max range)
- `/game.html`: player cards page
- `/api/generate-game-data.js`: serverless API route that calls `gemini-2.5-flash-lite`

## How gameplay works
- You pick total players (1-10).
- You pick imposter range (min to max).
- The app picks imposter count **uniformly at random** from that range.
- On next page, each player clicks exactly one card.
- Crewmates see the same `word + category`.
- Imposters see subtle hints.
- After a card is viewed and closed, it turns gray, locks, and cannot be clicked again.

## Gemini prompt behavior
API route asks Gemini for:
- `generate a random word and a category it fits under`
- `create subtle hints for imposters without making it too obvious`

## Run locally
1. Install Vercel CLI (optional):
   - `npm i -g vercel`
2. Set env var:
   - `GEMINI_API_KEY=your_key`
3. Run:
   - `vercel dev`
4. Open:
   - `http://localhost:3000`

If no key is set, the API falls back to local random words/hints.

## Deploy on Vercel (your account)
1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. In Vercel dashboard, click **Add New Project** and import the repo.
3. Framework preset: **Other** (or leave auto-detected).
4. Add env var in Vercel Project Settings:
   - `GEMINI_API_KEY=...`
5. Deploy.

## Who pays compute?
- **Vercel compute/bandwidth**: billed to **your Vercel account** (Hobby can be free within limits).
- **Gemini model usage**: billed to **your Google AI/Cloud account** tied to your API key.
- End users do not pay unless you build your own billing system.

## How to keep it free (or near-free)
- Use Vercel **Hobby** plan.
- Keep traffic low/moderate.
- Use `gemini-2.5-flash-lite` (cheap/small model).
- Keep prompts short.
- Do 1 generation call per game (already done).
- Optionally cache repeated prompts/results server-side.

