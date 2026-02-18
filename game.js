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
const imposterCount = Math.max(0, Math.min(session.imposterCount || 0, players));
const word = session.word || "Unknown";
const category = session.category || "Unknown";
const hints = Array.isArray(session.hints) ? session.hints : [];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const roles = shuffle([
  ...Array(imposterCount).fill("imposter"),
  ...Array(players - imposterCount).fill("crewmate"),
]);

let currentCard = null;
let hintsUsed = 0;

function lockCard(card) {
  card.classList.add("locked");
  card.disabled = true;
  card.textContent = `Player ${card.dataset.player} - Locked`;
}

function revealForPlayer(card) {
  const idx = Number(card.dataset.index);
  const role = roles[idx];

  if (role === "imposter") {
    const hint = hints[hintsUsed] || "Think broad theme, not exact term.";
    hintsUsed += 1;
    modalTitle.textContent = `Player ${idx + 1}: Imposter`;
    modalBody.textContent = `Hint: ${hint}`;
  } else {
    modalTitle.textContent = `Player ${idx + 1}: Crewmate`;
    modalBody.textContent = `Word: ${word} (Category: ${category})`;
  }

  currentCard = card;
  modal.classList.remove("hidden");
}

function buildCards() {
  cardsContainer.innerHTML = "";
  playerMeta.textContent = `${players} players | ${imposterCount} imposters`;

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
