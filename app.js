const playerCountInput = document.getElementById("playerCount");
const minImpostersInput = document.getElementById("minImposters");
const maxImpostersInput = document.getElementById("maxImposters");
const judgeEnabledInput = document.getElementById("judgeEnabled");

const playerCountValue = document.getElementById("playerCountValue");
const minImpostersValue = document.getElementById("minImpostersValue");
const maxImpostersValue = document.getElementById("maxImpostersValue");
const rangeSummary = document.getElementById("rangeSummary");
const statusText = document.getElementById("status");
const startGameBtn = document.getElementById("startGameBtn");
const RECENT_WORDS_KEY = "imposterRecentWords";

function randIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function syncRanges() {
  const players = Number(playerCountInput.value);
  if (judgeEnabledInput.checked && players < 2) {
    judgeEnabledInput.checked = false;
  }
  const judgeEnabled = Boolean(judgeEnabledInput.checked);
  const reservedForJudge = judgeEnabled ? 1 : 0;
  const maxAllowedImposters = Math.max(0, players - reservedForJudge - 1);

  minImpostersInput.max = String(maxAllowedImposters);
  maxImpostersInput.max = String(maxAllowedImposters);

  if (Number(minImpostersInput.value) > maxAllowedImposters) {
    minImpostersInput.value = String(maxAllowedImposters);
  }
  if (Number(maxImpostersInput.value) > maxAllowedImposters) {
    maxImpostersInput.value = String(maxAllowedImposters);
  }

  if (Number(minImpostersInput.value) > Number(maxImpostersInput.value)) {
    maxImpostersInput.value = minImpostersInput.value;
  }
  if (Number(maxImpostersInput.value) < Number(minImpostersInput.value)) {
    minImpostersInput.value = maxImpostersInput.value;
  }

  playerCountValue.textContent = playerCountInput.value;
  minImpostersValue.textContent = minImpostersInput.value;
  maxImpostersValue.textContent = maxImpostersInput.value;

  const judgeStatus = judgeEnabledInput.checked ? "Judge ON" : "Judge OFF";
  rangeSummary.textContent = `${judgeStatus}. A random imposter count will be selected uniformly from ${minImpostersInput.value} to ${maxImpostersInput.value}.`;
}

function buildAssignments(players, imposterCount, imposterHint, judgeEnabled) {
  const roles = [];
  if (judgeEnabled) {
    roles.push("judge");
  }
  roles.push(...Array(imposterCount).fill("imposter"));
  roles.push(...Array(players - imposterCount - (judgeEnabled ? 1 : 0)).fill("crewmate"));

  const shuffledRoles = shuffle(roles);
  const assignments = shuffledRoles.map((role) => ({ role }));

  assignments.forEach((assignment) => {
    if (assignment.role === "imposter") {
      assignment.hint = imposterHint || "Think broader than specifics.";
    }
  });

  if (judgeEnabled) {
    const crewmateIndices = assignments
      .map((assignment, idx) => (assignment.role === "crewmate" ? idx : -1))
      .filter((idx) => idx >= 0);
    const targetIdx = crewmateIndices[randIntInclusive(0, crewmateIndices.length - 1)];

    assignments.forEach((assignment) => {
      if (assignment.role === "judge") {
        assignment.targetPlayerNumber = targetIdx + 1;
      }
    });
  }

  return assignments;
}

async function startGame() {
  const players = Number(playerCountInput.value);
  const minImposters = Number(minImpostersInput.value);
  const maxImposters = Number(maxImpostersInput.value);
  const judgeEnabled = Boolean(judgeEnabledInput.checked);
  const imposterCount = randIntInclusive(minImposters, maxImposters);

  startGameBtn.disabled = true;
  statusText.textContent = "Generating word and hints...";

  try {
    let recentWords = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_WORDS_KEY) || "[]");
      recentWords = Array.isArray(parsed) ? parsed : [];
    } catch {
      recentWords = [];
    }

    const response = await fetch("/api/generate-game-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imposterCount, recentWords }),
    });

    const gameData = await response.json();
    if (!response.ok) {
      throw new Error(gameData.error || "API request failed");
    }

    const assignments = buildAssignments(players, imposterCount, gameData.hint, judgeEnabled);

    const session = {
      players,
      minImposters,
      maxImposters,
      imposterCount,
      judgeEnabled,
      word: gameData.word,
      category: gameData.category,
      assignments,
      source: gameData.source,
    };

    localStorage.setItem("imposterGameSession", JSON.stringify(session));
    const updatedRecentWords = [...recentWords, gameData.word].slice(-20);
    localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(updatedRecentWords));
    window.location.href = "/game.html";
  } catch (err) {
    statusText.textContent = `Could not start game: ${err.message}`;
    startGameBtn.disabled = false;
  }
}

playerCountInput.addEventListener("input", syncRanges);
minImpostersInput.addEventListener("input", syncRanges);
maxImpostersInput.addEventListener("input", syncRanges);
judgeEnabledInput.addEventListener("change", syncRanges);
startGameBtn.addEventListener("click", startGame);

syncRanges();
