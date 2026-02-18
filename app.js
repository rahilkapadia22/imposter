const playerCountInput = document.getElementById("playerCount");
const minImpostersInput = document.getElementById("minImposters");
const maxImpostersInput = document.getElementById("maxImposters");

const playerCountValue = document.getElementById("playerCountValue");
const minImpostersValue = document.getElementById("minImpostersValue");
const maxImpostersValue = document.getElementById("maxImpostersValue");
const rangeSummary = document.getElementById("rangeSummary");
const statusText = document.getElementById("status");
const startGameBtn = document.getElementById("startGameBtn");

function randIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function syncRanges() {
  const players = Number(playerCountInput.value);
  const minImposters = Number(minImpostersInput.value);
  const maxImposters = Number(maxImpostersInput.value);

  minImpostersInput.max = String(players);
  maxImpostersInput.max = String(players);

  if (minImposters > players) minImpostersInput.value = String(players);
  if (maxImposters > players) maxImpostersInput.value = String(players);

  if (Number(minImpostersInput.value) > Number(maxImpostersInput.value)) {
    maxImpostersInput.value = minImpostersInput.value;
  }

  if (Number(maxImpostersInput.value) < Number(minImpostersInput.value)) {
    minImpostersInput.value = maxImpostersInput.value;
  }

  playerCountValue.textContent = playerCountInput.value;
  minImpostersValue.textContent = minImpostersInput.value;
  maxImpostersValue.textContent = maxImpostersInput.value;
  rangeSummary.textContent = `A random imposter count will be selected uniformly from ${minImpostersInput.value} to ${maxImpostersInput.value}.`;
}

async function startGame() {
  const players = Number(playerCountInput.value);
  const minImposters = Number(minImpostersInput.value);
  const maxImposters = Number(maxImpostersInput.value);
  const imposterCount = randIntInclusive(minImposters, maxImposters);

  startGameBtn.disabled = true;
  statusText.textContent = "Generating word and hints...";

  try {
    const response = await fetch("/api/generate-game-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imposterCount }),
    });

    const gameData = await response.json();
    if (!response.ok) {
      throw new Error(gameData.error || "API request failed");
    }

    const session = {
      players,
      imposterCount,
      word: gameData.word,
      category: gameData.category,
      hints: gameData.hints,
    };

    localStorage.setItem("imposterGameSession", JSON.stringify(session));
    window.location.href = "/game.html";
  } catch (err) {
    statusText.textContent = `Could not start game: ${err.message}`;
    startGameBtn.disabled = false;
  }
}

playerCountInput.addEventListener("input", syncRanges);
minImpostersInput.addEventListener("input", syncRanges);
maxImpostersInput.addEventListener("input", syncRanges);
startGameBtn.addEventListener("click", startGame);

syncRanges();
