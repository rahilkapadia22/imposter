const fs = require("fs");
const path = require("path");

const PROMPT_TEMPLATE_PATH = path.join(__dirname, "..", "prompts", "gemini-game-prompt.txt");
const PROMPT_TEMPLATE = fs.readFileSync(PROMPT_TEMPLATE_PATH, "utf8");

const HINT_WORD_BANK = [
  "ambient",
  "blurred",
  "distant",
  "fleeting",
  "muted",
  "vague",
  "subtle",
  "hushed",
  "restless",
  "uneasy",
  "tense",
  "calm",
  "hollow",
  "weightless",
  "drifting",
  "dormant",
  "latent",
  "oblique",
  "indirect",
  "coded",
  "veiled",
  "fragile",
  "faint",
  "dim",
  "shadowed",
  "cool",
  "dry",
  "stale",
  "noisy",
  "still",
  "stern",
  "soft",
  "cold",
  "spare",
  "blank",
  "flat",
  "loose",
  "dull",
  "quiet",
  "odd",
];

function pickRandomHintWord() {
  return HINT_WORD_BANK[Math.floor(Math.random() * HINT_WORD_BANK.length)];
}

function normalizeHint(rawHint, word, category) {
  const bannedPieces = new Set(
    `${word} ${category}`
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter((p) => p.length >= 3),
  );

  if (typeof rawHint !== "string" || rawHint.trim().length === 0) {
    return pickRandomHintWord();
  }

  const firstWord = rawHint
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)[0];

  if (!firstWord) return pickRandomHintWord();
  if (bannedPieces.has(firstWord)) return pickRandomHintWord();
  if (!HINT_WORD_BANK.includes(firstWord)) return pickRandomHintWord();
  return firstWord;
}

async function generateWithGemini(imposterCount, recentWords, apiKey) {
  const recentWordsText = recentWords.length ? recentWords.join(", ") : "(none)";
  const prompt = PROMPT_TEMPLATE.replace("{{RECENT_WORDS}}", recentWordsText);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1.2,
          topP: 0.95,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || "";
    } catch {
      detail = "";
    }
    const error = new Error(detail || `Gemini API error: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No Gemini response text.");

  const parsed = JSON.parse(text);
  if (
    typeof parsed.word !== "string" ||
    typeof parsed.category !== "string" ||
    typeof parsed.hint !== "string"
  ) {
    throw new Error("Invalid Gemini JSON format.");
  }

  const word = parsed.word.trim();
  const category = parsed.category.trim();
  const hint = normalizeHint(parsed.hint, word, category);

  return { word, category, hint, source: "gemini" };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const imposterCount = Math.max(0, Math.min(Number(req.body?.imposterCount || 0), 10));
    const recentWords = Array.isArray(req.body?.recentWords)
      ? req.body.recentWords
          .filter((w) => typeof w === "string")
          .map((w) => w.trim())
          .filter((w) => w.length > 0)
          .slice(-50)
      : [];

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server missing GEMINI_API_KEY." });
    }

    const result = await generateWithGemini(imposterCount, recentWords, apiKey);
    return res.status(200).json(result);
  } catch (err) {
    if (err?.status === 429) {
      return res.status(429).json({ error: "Gemini free-tier limit reached. Try again later." });
    }

    return res.status(502).json({
      error: "Gemini request failed.",
      detail: err?.message || "Unknown error",
    });
  }
};
