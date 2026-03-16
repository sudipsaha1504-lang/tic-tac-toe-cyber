// Elements
const boxes = document.querySelectorAll(".box");
const resetBtn = document.getElementById("reset-btn");
const newGameBtn = document.getElementById("new-game");
const msgContainer = document.getElementById("msg-container");
const msg = document.getElementById("msg");
const turnText = document.getElementById("turn");
const xScoreEl = document.getElementById("x-score");
const oScoreEl = document.getElementById("o-score");
const drawScoreEl = document.getElementById("draw-score");
const themeBtn = document.getElementById("themeBtn");
const modeSelect = document.getElementById("mode");

// Sounds (you can replace URLs or remove)
const clickSound = new Audio("https://www.soundjay.com/buttons/sounds/button-16.mp3");
const winSound = new Audio("https://www.soundjay.com/human/sounds/applause-8.mp3");

// Game state
let isXturn = true;          // X always starts
let moveCount = 0;
let gameActive = true;
let scores = JSON.parse(localStorage.getItem("ttt-scores")) || { x: 0, o: 0, draw: 0 };

// Init scores
xScoreEl.textContent = scores.x;
oScoreEl.textContent = scores.o;
drawScoreEl.textContent = scores.draw;

const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// ==================== HELPERS ====================

function updateTurnText() {
    if (!gameActive) return;
    turnText.textContent = isXturn ? "X's turn" : "O's turn";
    if (!isXturn && modeSelect.value === "ai") {
        turnText.classList.add("thinking");
        turnText.textContent += " (AI thinking...)";
    } else {
        turnText.classList.remove("thinking");
    }
}

function disableAllBoxes() {
    boxes.forEach(b => b.disabled = true);
}

function enableAllBoxes() {
    boxes.forEach(b => {
        b.disabled = false;
        b.textContent = "";
        b.classList.remove("win");
    });
}

function resetGame(fullReset = false) {
    isXturn = true;
    moveCount = 0;
    gameActive = true;
    msgContainer.classList.add("hide");
    enableAllBoxes();
    updateTurnText();

    if (fullReset) {
        scores = { x: 0, o: 0, draw: 0 };
        localStorage.setItem("ttt-scores", JSON.stringify(scores));
        xScoreEl.textContent = 0;
        oScoreEl.textContent = 0;
        drawScoreEl.textContent = 0;
    }
}

// ==================== WIN / DRAW CHECK ====================

function checkGameState() {
    for (let [a, b, c] of winPatterns) {
        const va = boxes[a].textContent;
        if (va && va === boxes[b].textContent && va === boxes[c].textContent) {
            boxes[a].classList.add("win");
            boxes[b].classList.add("win");
            boxes[c].classList.add("win");
            showWinner(va);
            return true;
        }
    }

    if (moveCount === 9) {
        msg.textContent = "Draw!";
        msgContainer.classList.remove("hide");
        scores.draw++;
        drawScoreEl.textContent = scores.draw;
        localStorage.setItem("ttt-scores", JSON.stringify(scores));
        gameActive = false;
        disableAllBoxes();
        return true;
    }
    return false;
}

function showWinner(winner) {
    gameActive = false;
    disableAllBoxes();
    msg.textContent = `${winner} wins! 🎉`;
    msgContainer.classList.remove("hide");
    winSound.play();

    if (winner === "X") {
        scores.x++;
        xScoreEl.textContent = scores.x;
    } else {
        scores.o++;
        oScoreEl.textContent = scores.o;
    }
    localStorage.setItem("ttt-scores", JSON.stringify(scores));

    createConfetti();
    setTimeout(stopConfetti, 3500);
}

// ==================== CONFETTI ====================

const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];
let animFrame;

function createConfetti() {
    particles = [];
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 6 + 4,
            speedY: Math.random() * 4 + 2,
            hue: Math.random() * 360
        });
    }
    drawConfetti();
}

function drawConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
        ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        p.y += p.speedY;
        if (p.y > canvas.height + 20) particles.splice(i, 1);
    });

    if (particles.length > 0) {
        animFrame = requestAnimationFrame(drawConfetti);
    }
}

function stopConfetti() {
    cancelAnimationFrame(animFrame);
    particles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ==================== PLAYER CLICK ====================

boxes.forEach(box => {
    box.addEventListener("click", () => {
        if (!gameActive || box.disabled || box.textContent) return;

        clickSound.play();
        box.textContent = isXturn ? "X" : "O";
        box.disabled = true;
        moveCount++;

        if (checkGameState()) return;

        isXturn = !isXturn;
        updateTurnText();

        // AI turn?
        if (modeSelect.value === "ai" && !isXturn && gameActive) {
            disableAllBoxes();
            setTimeout(aiMakeMove, 500);
        }
    });
});

// ==================== AI (Minimax) – AI is always O ====================

function getBoard() {
    return Array.from(boxes).map(b => b.textContent || "");
}

function isTerminal(board) {
    for (let pattern of winPatterns) {
        let [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a] === "O" ? 1 : -1;
        }
    }
    return board.includes("") ? null : 0;
}

function minimax(board, isMaximizing, depth = 0) {
    let score = isTerminal(board);
    if (score !== null) {
        return score * (10 - depth);
    }

    if (isMaximizing) {   // AI = O
        let best = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (!board[i]) {
                board[i] = "O";
                best = Math.max(best, minimax(board, false, depth + 1));
                board[i] = "";
            }
        }
        return best;
    } else {              // Human = X
        let best = Infinity;
        for (let i = 0; i < 9; i++) {
            if (!board[i]) {
                board[i] = "X";
                best = Math.min(best, minimax(board, true, depth + 1));
                board[i] = "";
            }
        }
        return best;
    }
}

function aiMakeMove() {
    const board = getBoard();
    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
        if (!board[i]) {
            board[i] = "O";
            const score = minimax(board, false, 0);
            board[i] = "";
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }

    if (bestMove !== -1) {
        const box = boxes[bestMove];
        box.textContent = "O";
        box.disabled = true;
        clickSound.play();  // optional
        moveCount++;

        checkGameState();

        isXturn = true;
        updateTurnText();
    }

    if (gameActive) {
        boxes.forEach(b => { if (!b.textContent) b.disabled = false; });
    }
}

// ==================== EVENT LISTENERS ====================

resetBtn.addEventListener("click", () => resetGame(false));
newGameBtn.addEventListener("click", () => resetGame(true));

themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("cyber");
    themeBtn.textContent = document.body.classList.contains("cyber")
        ? "Light Mode"
        : "Cyber Mode";
});

// Start game
updateTurnText();