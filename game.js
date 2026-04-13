// ===================== KONFIGURÁCIÓ =====================
const COLS        = 20;
const ROWS        = 20;
const CELL        = 20;           // px / cella
const GOAL_PER_LVL = 10;          // alma / szint
const MAX_LEVEL   = 5;
const BASE_SPEED  = 160;          // ms / tick (1. szint)
const SPEED_STEP  = 20;           // ms gyorsulás szintenként

// ===================== DOM REFERENCIÁK =====================
const canvas       = document.getElementById('gameCanvas');
const ctx          = canvas.getContext('2d');
const scoreEl      = document.getElementById('score');
const highscoreEl  = document.getElementById('highscore');
const levelEl      = document.getElementById('level');
const goalEl       = document.getElementById('goal-display');
const progressBar  = document.getElementById('progress-bar');
const progressLbl  = document.getElementById('progress-label');

const overlay      = document.getElementById('overlay');
const winOverlay   = document.getElementById('win-overlay');
const loseOverlay  = document.getElementById('lose-overlay');
const levelupOverlay = document.getElementById('levelup-overlay');

const startBtn      = document.getElementById('startBtn');
const winRestartBtn = document.getElementById('winRestartBtn');
const loseRestartBtn= document.getElementById('loseRestartBtn');

const finalScoreWin  = document.getElementById('final-score-win');
const finalScoreLose = document.getElementById('final-score-lose');
const winMessage     = document.getElementById('win-message');
const loseMessage    = document.getElementById('lose-message');
const levelupTitle   = document.getElementById('levelup-title');
const levelupMsg     = document.getElementById('levelup-msg');

// ===================== ELŐRE RENDERELT RÁCS =====================
const gridCanvas = document.createElement('canvas');
gridCanvas.width  = COLS * CELL;
gridCanvas.height = ROWS * CELL;
(function buildGrid() {
  const gc = gridCanvas.getContext('2d');
  gc.strokeStyle = 'rgba(255,255,255,.03)';
  gc.lineWidth = 1;
  gc.beginPath();
  for (let x = 0; x <= COLS; x++) { gc.moveTo(x * CELL, 0); gc.lineTo(x * CELL, gridCanvas.height); }
  for (let y = 0; y <= ROWS; y++) { gc.moveTo(0, y * CELL); gc.lineTo(gridCanvas.width, y * CELL); }
  gc.stroke();
})();

// ===================== JÁTÉKÁLLAPOT =====================
let snake, dir, nextDir, food, bonusFood;
let score, highscore, level, applesThisLevel;
let gameLoop, gameRunning;
let particles = [];
let flashTimer = 0;
let rafStarted = false;

// ===================== INICIALIZÁLÁS =====================
function init() {
  score           = 0;
  level           = 1;
  applesThisLevel = 0;
  bonusFood       = null;
  particles       = [];
  flashTimer      = 0;

  snake = [
    { x: 10, y: 10 },
    { x:  9, y: 10 },
    { x:  8, y: 10 },
  ];
  dir     = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };

  placeFood();
  updateHUD();
  gameRunning = true;
}

// ===================== ÉTEL ELHELYEZÉSE =====================
function placeFood() {
  food = randomFreeCell();
}

function placeBonusFood() {
  bonusFood = { ...randomFreeCell(), timer: 80 };
}

function randomFreeCell() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y) ||
           (food && food.x === pos.x && food.y === pos.y));
  return pos;
}

// ===================== FŐCIKLUS =====================
function tick() {
  if (!gameRunning) return;

  dir = { ...nextDir };

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Fal ütközés
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    endGame('fal'); return;
  }
  // Önmaga
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    endGame('self'); return;
  }

  snake.unshift(head);

  let ate = false;

  // Normál étel
  if (head.x === food.x && head.y === food.y) {
    ate = true;
    score += 10;
    applesThisLevel++;
    spawnParticles(food.x, food.y, '#3fb950', 12);
    flashTimer = 8;

    // Minden 5. almánál bónusz étel jelenik meg
    if (applesThisLevel % 5 === 0 && !bonusFood) placeBonusFood();

    if (applesThisLevel >= GOAL_PER_LVL) {
      // Szint teljesítve
      if (gameLoop) clearInterval(gameLoop);
      updateHUD();

      if (level >= MAX_LEVEL) {
        setTimeout(showWin, 400);
      } else {
        setTimeout(nextLevel, 400);
      }
      return;
    }
    placeFood();
    updateHUD();
  }

  // Bónusz étel (csillag – 30 pont)
  if (bonusFood && head.x === bonusFood.x && head.y === bonusFood.y) {
    ate = true;
    score += 30;
    spawnParticles(bonusFood.x, bonusFood.y, '#e3b341', 18);
    bonusFood = null;
    flashTimer = 10;
    updateHUD();
  }

  if (!ate) snake.pop();

  // Bónusz étel ideje lejár
  if (bonusFood) {
    bonusFood.timer--;
    if (bonusFood.timer <= 0) bonusFood = null;
  }

  // Részecskék fizikája (logika, nem rajzolás)
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.15;
    p.life--;
  });

  if (flashTimer > 0) flashTimer--;
  // Rajzolást a rAF végzi — itt NEM hívunk draw()-t
}

// ===================== SZINT EMELÉS =====================
function nextLevel() {
  level++;
  applesThisLevel = 0;
  bonusFood = null;

  levelupTitle.textContent = `${level - 1}. Szint Teljesítve!`;
  levelupMsg.textContent   = `${level}. szint kezdődik – a kígyó gyorsabb lesz!`;
  showOverlay(levelupOverlay);

  setTimeout(() => {
    hideOverlay(levelupOverlay);
    placeFood();
    updateHUD();
    startGameLoop();
    draw();
  }, 2000);
}

// ===================== GYŐZELEM / VERESÉG =====================
function showWin() {
  saveHighscore();
  finalScoreWin.textContent = score;
  winMessage.textContent    = `Teljesítetted mind a ${MAX_LEVEL} szintet! Igazi mester vagy! 🏆`;
  showOverlay(winOverlay);
}

function endGame(reason) {
  gameRunning = false;
  if (gameLoop) clearInterval(gameLoop);
  saveHighscore();

  finalScoreLose.textContent = score;
  loseMessage.textContent = reason === 'fal'
    ? 'Nekimentél a falnak! Legyél óvatosabb!'
    : 'Elharapod magad! Vigyázz a testedre!';

  setTimeout(() => showOverlay(loseOverlay), 300);
}

// ===================== RAJZOLÁS =====================
function draw() {
  // Alap háttér + előre renderelt rács (1 drawImage, nem 82 stroke)
  ctx.fillStyle = '#0a0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(gridCanvas, 0, 0);

  // Flash hatás alma evéskor
  if (flashTimer > 0) {
    ctx.fillStyle = `rgba(63,185,80,${(flashTimer / 10) * 0.07})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Bónusz étel (csillag)
  if (bonusFood) {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 150);
    const bx = bonusFood.x * CELL + CELL / 2;
    const by = bonusFood.y * CELL + CELL / 2;
    ctx.save();
    ctx.globalAlpha = 0.3 * pulse;
    ctx.fillStyle = '#e3b341';
    ctx.beginPath();
    ctx.arc(bx, by, CELL * .8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `${Math.round(CELL * .9)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', bx, by);
    // időzítő pite
    const pct = bonusFood.timer / 80;
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, CELL * .85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.stroke();
    ctx.restore();
  }

  // Étel (alma)
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  const pulse2 = 1 + .08 * Math.sin(Date.now() / 200);
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(pulse2, pulse2);
  ctx.font = `${Math.round(CELL * .85)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍎', 0, 0);
  ctx.restore();

  // Kígyó
  snake.forEach((seg, i) => {
    const x = seg.x * CELL;
    const y = seg.y * CELL;
    const isHead = i === 0;
    const t = 1 - i / snake.length;

    if (isHead) {
      // Ragyogás fej körül
      const grd = ctx.createRadialGradient(
        x + CELL/2, y + CELL/2, 0,
        x + CELL/2, y + CELL/2, CELL
      );
      grd.addColorStop(0, 'rgba(63,185,80,.4)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(x - CELL/2, y - CELL/2, CELL * 2, CELL * 2);
    }

    // Test szín gradiens
    const green = Math.round(100 + 85 * t);
    ctx.fillStyle = isHead
      ? '#3fb950'
      : `rgb(20,${green},30)`;

    const r  = isHead ? 7 : 5;
    const pad = isHead ? 1 : 2;
    roundRect(ctx, x + pad, y + pad, CELL - pad*2, CELL - pad*2, r);
    ctx.fill();

    // Szemek a fejre
    if (isHead) {
      ctx.fillStyle = '#fff';
      const ex1 = x + CELL * .65, ey1 = y + CELL * .3;
      const ex2 = x + CELL * .65, ey2 = y + CELL * .7;
      if (dir.x === 1)  { drawEye(x+CELL*.7, y+CELL*.3); drawEye(x+CELL*.7, y+CELL*.7); }
      else if (dir.x === -1) { drawEye(x+CELL*.3, y+CELL*.3); drawEye(x+CELL*.3, y+CELL*.7); }
      else if (dir.y === -1) { drawEye(x+CELL*.3, y+CELL*.3); drawEye(x+CELL*.7, y+CELL*.3); }
      else               { drawEye(x+CELL*.3, y+CELL*.7); drawEye(x+CELL*.7, y+CELL*.7); }
    }
  });

  // Részecskék
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawEye(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + .5, y + .5, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ===================== RÉSZECSKÉK =====================
function spawnParticles(gx, gy, color, count) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * .5;
    const speed = 1.5 + Math.random() * 2;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      color,
      size: 2 + Math.random() * 2,
      life: 30 + Math.random() * 20,
      maxLife: 50,
    });
  }
}

// ===================== HUD FRISSÍTÉS =====================
function updateHUD() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  goalEl.textContent  = GOAL_PER_LVL;

  const pct = (applesThisLevel / GOAL_PER_LVL) * 100;
  progressBar.style.width = pct + '%';
  progressLbl.textContent = `${applesThisLevel} / ${GOAL_PER_LVL}`;

  highscore = Math.max(score, Number(localStorage.getItem('snakeHS') || 0));
  highscoreEl.textContent = highscore;
}

function saveHighscore() {
  const prev = Number(localStorage.getItem('snakeHS') || 0);
  if (score > prev) localStorage.setItem('snakeHS', score);
  updateHUD();
}

// ===================== JÁTÉKCIKLUS INDÍTÁSA =====================
function startGameLoop() {
  if (gameLoop) clearInterval(gameLoop);
  const speed = Math.max(60, BASE_SPEED - (level - 1) * SPEED_STEP);
  gameLoop = setInterval(tick, speed);
}

// ===================== OVERLAY SEGÉDFÜGGVÉNYEK =====================
function showOverlay(el) {
  [overlay, winOverlay, loseOverlay, levelupOverlay].forEach(o => o.classList.remove('active'));
  el.classList.add('active');
}
function hideOverlay(el) { el.classList.remove('active'); }

// ===================== BEVITELKEZELÉS =====================
const keyMap = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
  W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
};

document.addEventListener('keydown', e => {
  const d = keyMap[e.key];
  if (!d) return;
  e.preventDefault();
  changeDir(d);
});

document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', () => changeDir(btn.dataset.dir));
});

function changeDir(d) {
  if (!gameRunning) return;
  if (d === 'UP'    && dir.y !== 1)  nextDir = { x:  0, y: -1 };
  if (d === 'DOWN'  && dir.y !== -1) nextDir = { x:  0, y:  1 };
  if (d === 'LEFT'  && dir.x !== 1)  nextDir = { x: -1, y:  0 };
  if (d === 'RIGHT' && dir.x !== -1) nextDir = { x:  1, y:  0 };
}

// ===================== GOMBOK =====================
startBtn.addEventListener('click', () => {
  hideOverlay(overlay);
  init();
  startGameLoop();
});

winRestartBtn.addEventListener('click', () => {
  hideOverlay(winOverlay);
  init();
  startGameLoop();
});

loseRestartBtn.addEventListener('click', () => {
  hideOverlay(loseOverlay);
  init();
  startGameLoop();
});

// ===================== ANIMÁCIÓS KERET – 60fps rajzolás =====================
function animFrame() {
  if (gameRunning) draw();
  requestAnimationFrame(animFrame);
}

// ===================== INDÍTÁS =====================
highscoreEl.textContent = localStorage.getItem('snakeHS') || 0;

// Rajzolási ciklus egyszer indul el, örökre fut
requestAnimationFrame(animFrame);
