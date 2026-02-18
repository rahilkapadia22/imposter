async function generateWithGemini(imposterCount, apiKey) {
  const prompt = `Return JSON only. Generate:
1) A random single word and a category it fits under.
2) ${imposterCount} subtle hints that describe the word without making it obvious.
Format exactly as:
{"word":"...","category":"...","hints":["..."]}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 1,
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
  if (!text) {
    throw new Error("No Gemini response text.");
  }

  const parsed = JSON.parse(text);
  if (
    typeof parsed.word !== "string" ||
    typeof parsed.category !== "string" ||
    !Array.isArray(parsed.hints)
  ) {
    throw new Error("Invalid Gemini JSON format.");
  }

  const hints = parsed.hints
    .filter((h) => typeof h === "string" && h.trim().length > 0)
    .slice(0, imposterCount);

  while (hints.length < imposterCount) {
    hints.push("Think broader than specifics.");
  }

  return {
    word: parsed.word.trim(),
    category: parsed.category.trim(),
    hints,
    source: "gemini",
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const imposterCount = Math.max(0, Math.min(Number(req.body?.imposterCount || 0), 10));
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Server missing GEMINI_API_KEY.",
      });
    }

    const result = await generateWithGemini(imposterCount, apiKey);
    return res.status(200).json(result);
  } catch (err) {
    if (err?.status === 429) {
      return res.status(429).json({
        error: "Gemini free-tier limit reached. Try again later.",
      });
    }

    return res.status(502).json({
      error: "Gemini request failed.",
      detail: err?.message || "Unknown error",
    });
  }
};
