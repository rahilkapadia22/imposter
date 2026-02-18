const cardsContainer = document.getElementById("cards");
const playerMeta = document.getElementById("playerMeta");
const newGameBtn = document.getElementById("newGameBtn");

const modal = document.getElementById("revealModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");

const sessionRaw = localStorage.getItem("imposterGameSession");
if (!sessionRaw) {
  window.location.href = "/";
}

const session = JSON.parse(sessionRaw || "{}");
const players = session.players || 0;
const minImposters = Number(session.minImposters ?? session.imposterCount ?? 0);
const maxImposters = Number(session.maxImposters ?? session.imposterCount ?? 0);
const imposterCount = Math.max(0, Math.min(session.imposterCount || 0, players));
const judgeEnabled = Boolean(session.judgeEnabled);
const word = session.word || "Unknown";
const category = session.category || "Unknown";
const assignments = Array.isArray(session.assignments) ? session.assignments : [];

if (!players || assignments.length !== players) {
  window.location.href = "/";
}

let currentCard = null;

function lockCard(card) {
  card.classList.add("locked");
  card.disabled = true;
  card.textContent = `Player ${card.dataset.player} - Locked`;
}

function revealForPlayer(card) {
  const idx = Number(card.dataset.index);
  const assignment = assignments[idx] || { role: "crewmate" };

  if (assignment.role === "imposter") {
    modalTitle.textContent = `Player ${idx + 1}: Imposter`;
    modalBody.textContent = `Category: ${category} | Hint: ${assignment.hint || "Think broad theme, not exact term."}`;
  } else if (assignment.role === "judge") {
    modalTitle.textContent = `Player ${idx + 1}: Judge`;
    modalBody.textContent = `Word: ${word} (Category: ${category}). Your target is Player ${assignment.targetPlayerNumber}. Guide votes toward that player.`;
  } else {
    modalTitle.textContent = `Player ${idx + 1}: Crewmate`;
    modalBody.textContent = `Word: ${word} (Category: ${category})`;
  }

  currentCard = card;
  modal.classList.remove("hidden");
}

function buildCards() {
  cardsContainer.innerHTML = "";
  const usedRange = minImposters !== maxImposters;
  if (usedRange) {
    playerMeta.textContent = `${players} players`;
  } else {
    const judgeLabel = judgeEnabled ? " | 1 judge" : "";
    playerMeta.textContent = `${players} players | ${imposterCount} imposters${judgeLabel}`;
  }

  for (let i = 0; i < players; i += 1) {
    const btn = document.createElement("button");
    btn.className = "player-card";
    btn.dataset.index = String(i);
    btn.dataset.player = String(i + 1);
    btn.textContent = `Player ${i + 1}`;

    btn.addEventListener("click", () => revealForPlayer(btn));
    cardsContainer.appendChild(btn);
  }
}

closeModalBtn.addEventListener("click", () => {
  if (currentCard) {
    lockCard(currentCard);
    currentCard = null;
  }
  modal.classList.add("hidden");
});

newGameBtn.addEventListener("click", () => {
  localStorage.removeItem("imposterGameSession");
  window.location.href = "/";
});

buildCards();
