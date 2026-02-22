const fs = require("fs");
const path = require("path");

const PROMPT_TEMPLATE_PATH = path.join(__dirname, "..", "prompts", "gemini-game-prompt.txt");
const PROMPT_TEMPLATE = fs.readFileSync(PROMPT_TEMPLATE_PATH, "utf8");

async function generateWithGemini(imposterCount, recentWords, apiKey) {
  const recentWordsText = recentWords.length ? recentWords.join(", ") : "(none)";
  const prompt = PROMPT_TEMPLATE.replace("{{RECENT_WORDS}}", recentWordsText);

  const configuredModels = (process.env.GEMINI_MODEL_FALLBACKS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const modelsToTry = configuredModels.length
    ? configuredModels
    : [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.5-flash-lite",
      ];

  const failures = [];

  for (const model of modelsToTry) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      failures.push({
        model,
        status: response.status,
        detail: detail || `Gemini API error: ${response.status}`,
      });
      continue;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      failures.push({ model, status: 502, detail: "No Gemini response text." });
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      failures.push({ model, status: 502, detail: "Gemini returned non-JSON output." });
      continue;
    }

    if (
      typeof parsed.word !== "string" ||
      typeof parsed.category !== "string" ||
      typeof parsed.hint !== "string"
    ) {
      failures.push({ model, status: 502, detail: "Invalid Gemini JSON format." });
      continue;
    }

    const word = parsed.word.trim();
    const category = parsed.category.trim();
    const hint = parsed.hint.trim();
    return { word, category, hint, source: "gemini", model };
  }

  const allRateLimited = failures.length > 0 && failures.every((f) => f.status === 429);
  const error = new Error(
    failures.length
      ? `All Gemini models failed: ${failures
          .map((f) => `${f.model} (${f.status})`)
          .join(", ")}`
      : "No Gemini models configured.",
  );
  error.status = allRateLimited ? 429 : 502;
  throw error;
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
