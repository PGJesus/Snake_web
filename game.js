const WIN_SCORE = 5;
const SPEED_START = 130;
const SPEED_MIN   = 55;

const COLS = 20, ROWS = 20, CELL = 20;
const canvas  = document.getElementById('c');
const ctx     = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl  = document.getElementById('best');
const msgEl   = document.getElementById('msg');
const modal   = document.getElementById('modal');
const modalSub   = document.getElementById('modal-sub');
const btnReplay  = document.getElementById('btn-replay');
const btnEndless = document.getElementById('btn-endless');

let snake, dir, next, food, score, running, loop, endless;
let highScore = parseInt(localStorage.getItem('snake_hs') || '0');

bestEl.textContent = 'BEST: ' + highScore;

function speed() {
  const t = Math.min(score / WIN_SCORE, 1);
  return Math.round(SPEED_START - t * (SPEED_START - SPEED_MIN));
}

function init(endlessMode) {
  endless = !!endlessMode;
  snake = [{x:10, y:10}, {x:9, y:10}, {x:8, y:10}];
  dir  = {x:0, y:0};
  next = {x:0, y:0};
  score = 0;
  running = false;
  scoreEl.textContent = 'SCORE: 0';
  msgEl.textContent = endless
    ? 'endless — press any arrow key to start'
    : 'press any arrow key to start';
  modal.classList.add('hidden');
  placeFood();
  draw();
  clearInterval(loop);
}

function placeFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function start() {
  running = true;
  msgEl.textContent = '';
  clearInterval(loop);
  loop = setInterval(tick, speed());
}

function setSpeed() {
  clearInterval(loop);
  loop = setInterval(tick, speed());
}

function tick() {
  dir = next;
  if (dir.x === 0 && dir.y === 0) return;

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return end();
  if (snake.some(s => s.x === head.x && s.y === head.y)) return end();

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = 'SCORE: ' + score;
    checkHighScore();
    setSpeed();
    if (!endless && score >= WIN_SCORE) return win();
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function checkHighScore() {
  if (score <= highScore) return;
  highScore = score;
  localStorage.setItem('snake_hs', highScore);
  bestEl.textContent = 'BEST: ' + highScore;
  bestEl.classList.remove('new-record');
  void bestEl.offsetWidth;
  bestEl.classList.add('new-record');
  bestEl.addEventListener('animationend', () => bestEl.classList.remove('new-record'), { once: true });
}

function win() {
  clearInterval(loop);
  running = false;
  draw();
  modalSub.textContent = 'you reached ' + score + ' points';
  modal.classList.remove('hidden');
}

function end() {
  clearInterval(loop);
  running = false;
  let flashes = 0;
  const flash = setInterval(() => {
    ctx.fillStyle = flashes % 2 === 0 ? '#300' : '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (++flashes >= 6) { clearInterval(flash); draw(); }
  }, 80);
  msgEl.textContent = 'game over — press any arrow key to restart';
}

function draw() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(food.x * CELL + 4, food.y * CELL + 4, CELL - 8, CELL - 8);

  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? '#2ecc71' : '#27ae60';
    ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

document.addEventListener('keydown', e => {
  const map = {
    ArrowUp:    {x:0,  y:-1},
    ArrowDown:  {x:0,  y:1},
    ArrowLeft:  {x:-1, y:0},
    ArrowRight: {x:1,  y:0},
  };
  const d = map[e.key];
  if (!d) return;
  e.preventDefault();

  if (d.x === -dir.x && d.y === -dir.y) return;

  next = d;
  if (!running) {
    if (score > 0 || snake.length !== 3 || dir.x !== 0 || dir.y !== 0) init(endless);
    start();
  }
});

btnReplay.addEventListener('click', () => { init(false); });
btnEndless.addEventListener('click', () => { init(true); });

init(false);
