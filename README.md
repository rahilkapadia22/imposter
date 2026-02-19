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
