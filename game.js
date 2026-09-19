const assets = {
  bird: 'assets/bibin.jpg',
  photoOne: 'assets/ugly-bibin.jpg',
  photoTwo: 'assets/unlock-2.jpg',
  gameOver: 'assets/game-over.jpg',
  crash: 'assets/jump.mp3',
};

const modes = {
  beginner: { label: 'BEGINNER', target: 3, gap: .36, speed: .82 },
  intermediate: { label: 'INTERMEDIATE', target: 5, gap: .285, speed: 1.04 },
  infinite: { label: 'INFINITE MODE', gap: .285, speed: 1.06 },
};

const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const screen = document.querySelector('#screen');
const screenCard = document.querySelector('#screenCard');
const stagePill = document.querySelector('#stagePill');
const scoreText = document.querySelector('#scoreText');
const bestHud = document.querySelector('#bestHud');
const currentScore = document.querySelector('#currentScore');
const bestScore = document.querySelector('#bestScore');
const stageText = document.querySelector('#stageText');
const lockerText = document.querySelector('#lockerText');
const journey = document.querySelector('#journey');
const locker = document.querySelector('#locker');

const birdImage = new Image();
birdImage.src = assets.bird;
const gameOverImage = new Image();
gameOverImage.src = assets.gameOver;

const readBool = (key) => {
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
};
const readBest = () => {
  try { return Number(localStorage.getItem('bibin-best') || 0); } catch { return 0; }
};
const writeProgress = (key) => {
  try { localStorage.setItem(key, 'true'); } catch { /* local storage is optional */ }
};

const state = {
  phase: 'menu',
  mode: 'beginner',
  score: 0,
  best: readBest(),
  beginnerComplete: readBool('bibin-beginner-complete'),
  photoOneUnlocked: readBool('bibin-photo-1-unlocked') || readBool('bibin-beginner-complete'),
  photoTwoUnlocked: readBool('bibin-photo-2-unlocked') || readBool('bibin-intermediate-complete'),
};

let width = 0;
let height = 0;
let lastTime = performance.now();
let pipes = [];
let player = { x: 0, y: 0, velocity: 0, tilt: 0 };
let runEnded = false;

function resize() {
  const ratio = window.devicePixelRatio || 1;
  width = canvas.clientWidth || 800;
  height = canvas.clientHeight || 500;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  resetWorld();
  draw();
}

function resetWorld() {
  player = { x: width * .27, y: height * .47, velocity: 0, tilt: 0 };
  pipes = [];
  runEnded = false;
  for (let i = 0; i < 3; i += 1) {
    pipes.push({
      x: width + 180 + i * Math.max(235, width * .42),
      gapY: height * (.3 + Math.random() * .34),
      gap: height * modes[state.mode].gap,
      scored: false,
    });
  }
}

function drawBackground(time) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#71c9d4');
  sky.addColorStop(.62, '#b8e2c2');
  sky.addColorStop(1, '#f2cf7c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,.23)';
  for (let i = 0; i < 4; i += 1) {
    const cloudX = (i * 270 + 60 - (time / 70) % (width + 320));
    ctx.beginPath();
    ctx.ellipse(cloudX, 83 + i * 31, 65, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cloudX + 32, 75 + i * 31, 42, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(31,113,94,.17)';
  ctx.beginPath();
  ctx.moveTo(0, height - 75);
  ctx.quadraticCurveTo(width * .2, height - 135, width * .45, height - 77);
  ctx.quadraticCurveTo(width * .76, height - 152, width, height - 73);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();
  ctx.fillStyle = '#d99f57';
  ctx.fillRect(0, height - 28, width, 28);
  ctx.fillStyle = '#f3cc74';
  ctx.fillRect(0, height - 28, width, 5);
}

function drawPipe(pipe) {
  const pipeWidth = Math.max(55, width * .1);
  const topEnd = pipe.gapY - pipe.gap / 2;
  const bottomStart = pipe.gapY + pipe.gap / 2;
  const paint = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
  paint.addColorStop(0, '#2e7c4b');
  paint.addColorStop(.34, '#73bd48');
  paint.addColorStop(.55, '#b4d95c');
  paint.addColorStop(1, '#347f47');
  ctx.fillStyle = paint;
  ctx.fillRect(pipe.x, 0, pipeWidth, topEnd);
  ctx.fillRect(pipe.x, bottomStart, pipeWidth, height - bottomStart);
  ctx.fillStyle = '#1d5c3e';
  ctx.fillRect(pipe.x - 7, topEnd - 19, pipeWidth + 14, 19);
  ctx.fillRect(pipe.x - 7, bottomStart, pipeWidth + 14, 19);
  ctx.strokeStyle = 'rgba(18,65,42,.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(pipe.x, 0, pipeWidth, topEnd);
  ctx.strokeRect(pipe.x, bottomStart, pipeWidth, height - bottomStart);
}

function drawPlayer() {
  const size = Math.max(64, Math.min(105, height * .17));
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt);
  ctx.shadowColor = 'rgba(22,27,47,.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 7;
  ctx.drawImage(birdImage, -size / 2, -size / 2, size, size * .75);
  ctx.restore();
}

function draw(time = performance.now()) {
  drawBackground(time);
  pipes.forEach(drawPipe);
  drawPlayer();
  if (state.phase !== 'playing') {
    ctx.fillStyle = 'rgba(17,25,47,.12)';
    ctx.fillRect(0, 0, width, height);
  }
}

function flap(event) {
  event?.preventDefault();
  if (state.phase !== 'playing' || runEnded) return;
  player.velocity = -height * .009 - 3.1;
}

function crash() {
  runEnded = true;
  state.phase = 'gameover';
  state.best = Math.max(state.best, state.score);
  try { localStorage.setItem('bibin-best', String(state.best)); } catch { /* optional */ }
  try {
    const sound = new Audio(assets.crash);
    sound.volume = .42;
    void sound.play();
  } catch { /* audio can be blocked */ }
  renderSidebar();
  renderGameOver();
}

function complete() {
  runEnded = true;
  state.phase = 'complete';
  if (state.mode === 'beginner') {
    state.beginnerComplete = true;
    state.photoOneUnlocked = true;
    writeProgress('bibin-beginner-complete');
    writeProgress('bibin-photo-1-unlocked');
  }
  if (state.mode === 'intermediate') {
    state.photoTwoUnlocked = true;
    writeProgress('bibin-intermediate-complete');
    writeProgress('bibin-photo-2-unlocked');
  }
  renderSidebar();
  renderComplete();
}

function tick(time) {
  const delta = Math.min(32, time - lastTime);
  lastTime = time;
  if (state.phase === 'playing' && !runEnded) {
    const scale = delta / 16.67;
    player.velocity += .32 * scale;
    player.y += player.velocity * scale;
    player.tilt = Math.max(-.5, Math.min(1.15, player.velocity / 9));
    const config = modes[state.mode];
    const difficulty = state.mode === 'infinite' ? Math.min(.34, state.score * .0025) : 0;
    const speed = Math.max(2.8, width / 275) * (config.speed + difficulty) * scale;
    const pipeWidth = Math.max(55, width * .1);

    pipes.forEach((pipe) => {
      pipe.x -= speed;
      if (!pipe.scored && pipe.x + pipeWidth < player.x) {
        pipe.scored = true;
        state.score += 1;
        if (config.target && state.score >= config.target) complete();
      }
    });

    if (!runEnded && pipes[0].x < -pipeWidth - 25) {
      pipes.shift();
      const last = pipes[pipes.length - 1];
      const gap = state.mode === 'infinite'
        ? Math.max(112, height * (.285 - Math.min(.11, state.score * .002)))
        : height * config.gap;
      pipes.push({
        x: last.x + Math.max(235, width * .42),
        gapY: height * (.24 + Math.random() * .4),
        gap,
        scored: false,
      });
    }

    const pipe = pipes.find((item) => item.x + pipeWidth > player.x - 22 && item.x < player.x + 22);
    const hitPipe = pipe && (player.y - 22 < pipe.gapY - pipe.gap / 2 || player.y + 22 > pipe.gapY + pipe.gap / 2);
    if (!runEnded && (player.y > height - 29 || player.y < 8 || hitPipe)) crash();
  }
  render();
  requestAnimationFrame(tick);
}

function setScreen(html) {
  screenCard.innerHTML = html;
  screen.classList.remove('hidden');
}

function button(text, className, handler, disabled = false) {
  const element = document.createElement('button');
  element.className = `button ${className || ''}`;
  element.textContent = text;
  element.disabled = disabled;
  element.addEventListener('click', handler);
  return element;
}

function setButtons(container, buttons) {
  const row = document.createElement('div');
  row.className = buttons.length > 1 ? 'button-row' : 'mode-buttons';
  buttons.forEach((item) => row.appendChild(item));
  container.appendChild(row);
}

function start(mode) {
  state.mode = mode;
  state.score = 0;
  state.phase = 'playing';
  resetWorld();
  screen.classList.add('hidden');
  render();
}

function openReveal(photo) {
  state.phase = 'reveal';
  const image = photo === 1 ? assets.photoOne : assets.photoTwo;
  setScreen(`
    <div class="eyebrow">Evidence locker / file 0${photo}</div>
    <h1>CONGRATS<br><span>YOU UNLOCKED BIBIN</span></h1>
    <p>This image was hidden behind a perfectly reasonable amount of bird-related suffering.</p>
    <img class="reveal-image" src="${image}" alt="Unlocked Bibin evidence" />
  `);
  const row = screenCard.querySelector('p').after(document.createElement('div'));
  const actions = screenCard.lastElementChild;
  actions.className = 'button-row';
  if (state.photoOneUnlocked && state.photoTwoUnlocked) {
    actions.appendChild(button('Next file', 'ghost', () => openReveal(photo === 1 ? 2 : 1)));
  }
  actions.appendChild(button(photo === 1 ? 'Start Intermediate' : 'Enter Infinite Mode', '', () => start(photo === 1 ? 'intermediate' : 'infinite')));
  renderSidebar();
}

function renderMenu() {
  state.phase = 'menu';
  setScreen(`
    <img class="player-preview" src="${assets.bird}" alt="Bibin with pixel wings" />
    <div class="eyebrow">The internet's least necessary game</div>
    <h1>BIBIN<br><span>JUMP</span></h1>
    <p>How long can Bibin survive? Guide him through the pipes and avoid a deeply unnecessary consequence.</p>
  `);
  const modeButtons = document.createElement('div');
  modeButtons.className = 'mode-buttons';
  modeButtons.appendChild(button('Start Beginner', '', () => start('beginner')));
  modeButtons.appendChild(button(state.beginnerComplete ? 'Start Intermediate' : 'Intermediate Locked', 'secondary', () => start('intermediate'), !state.beginnerComplete));
  modeButtons.appendChild(button(state.photoTwoUnlocked ? 'Enter Infinite Mode' : 'Infinite Mode Locked', 'ghost', () => start('infinite'), !state.photoTwoUnlocked));
  screenCard.appendChild(modeButtons);
  const hint = document.createElement('div');
  hint.className = 'microcopy';
  hint.textContent = 'Tap / Click / Press SPACE to jump';
  screenCard.appendChild(hint);
  renderSidebar();
}

function renderComplete() {
  setScreen(`
    <div class="eyebrow">Checkpoint cleared / ${modes[state.mode].label}</div>
    <h1>${state.mode === 'beginner' ? 'BEGINNER<br><span>CLEARED</span>' : 'YOU<br><span>DID IT</span>'}</h1>
    <p>Bibin survived <strong>${state.score}</strong> pipes. This is now officially more achievement than game.</p>
  `);
  const actions = document.createElement('div');
  actions.className = 'button-row';
  actions.appendChild(button(state.mode === 'beginner' ? 'Unlock File 01' : 'Unlock File 02', '', () => openReveal(state.mode === 'beginner' ? 1 : 2)));
  actions.appendChild(button('Menu', 'ghost', renderMenu));
  screenCard.appendChild(actions);
  renderSidebar();
}

function renderGameOver() {
  setScreen(`
    <img class="modal-art" src="${assets.gameOver}" alt="Bibin between pipes with game over lettering" />
    <div class="eyebrow">Flight terminated with dignity</div>
    <h1>NEEP OOMBI<br><span>MYRE</span></h1>
    <p>Bibin made it through <strong>${state.score}</strong> pipe${state.score === 1 ? '' : 's'}. A historic journey, technically.</p>
    <div class="microcopy">${state.photoTwoUnlocked ? 'Both evidence files unlocked' : state.photoOneUnlocked ? 'File 01 unlocked / Clear Intermediate for File 02' : 'Clear 3 pipes to unlock File 01'}</div>
  `);
  const actions = document.createElement('div');
  actions.className = 'button-row';
  actions.appendChild(button(`Retry ${modes[state.mode].label}`, '', () => start(state.mode)));
  if (state.photoOneUnlocked || state.photoTwoUnlocked) {
    actions.appendChild(button('Open evidence', 'secondary', () => openReveal(state.photoTwoUnlocked ? 2 : 1)));
  }
  actions.appendChild(button('Menu', 'ghost', renderMenu));
  screenCard.appendChild(actions);
  renderSidebar();
}

function renderScreen() {
  if (state.phase === 'menu') renderMenu();
  if (state.phase === 'complete') renderComplete();
  if (state.phase === 'gameover') renderGameOver();
}

function renderSidebar() {
  const config = modes[state.mode];
  scoreText.textContent = `SCORE: ${state.score}`;
  bestHud.textContent = `BEST: ${state.best}`;
  currentScore.textContent = state.score;
  bestScore.textContent = state.best;
  stageText.textContent = config.label;
  lockerText.textContent = state.photoTwoUnlocked ? '02 / 02' : state.photoOneUnlocked ? '01 / 02' : 'LOCKED';
  const steps = [
    ['Beginner', state.beginnerComplete ? 'done' : state.mode === 'beginner' ? 'active' : 'locked'],
    ['File 01', state.photoOneUnlocked ? 'done' : state.beginnerComplete ? 'active' : 'locked'],
    ['Intermediate', state.photoTwoUnlocked ? 'done' : state.beginnerComplete ? 'active' : 'locked'],
    ['File 02', state.photoTwoUnlocked ? 'done' : state.photoOneUnlocked ? 'active' : 'locked'],
    ['Infinite', state.photoTwoUnlocked ? state.mode === 'infinite' ? 'active' : 'ready' : 'locked'],
  ];
  journey.innerHTML = steps.map(([label, status], index) => `<div class="journey-step ${status}"><span class="journey-dot">${status === 'done' ? '✓' : String(index + 1).padStart(2, '0')}</span><span>${label}</span></div>`).join('');
  locker.innerHTML = '';
  if (state.photoOneUnlocked) {
    const tile = document.createElement('button');
    tile.className = 'locker-tile unlocked';
    tile.innerHTML = `<img src="${assets.photoOne}" alt="Unlocked File 01" /><span>File 01</span>`;
    tile.addEventListener('click', () => openReveal(1));
    locker.appendChild(tile);
  } else {
    locker.innerHTML += '<div class="locker-tile locked-tile">File 01 / Locked</div>';
  }
  if (state.photoTwoUnlocked) {
    const tile = document.createElement('button');
    tile.className = 'locker-tile unlocked';
    tile.innerHTML = `<img src="${assets.photoTwo}" alt="Unlocked File 02" /><span>File 02</span>`;
    tile.addEventListener('click', () => openReveal(2));
    locker.appendChild(tile);
  } else {
    locker.innerHTML += '<div class="locker-tile locked-tile">File 02 / Clear Intermediate</div>';
  }
  stagePill.textContent = `${state.phase === 'playing' ? config.label : state.phase.toUpperCase()} / flappy protocol`;
  stagePill.classList.toggle('live', state.phase === 'playing');
}

function render() {
  draw();
  renderSidebar();
}

canvas.addEventListener('pointerdown', flap, { passive: false });
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') flap(event);
});
window.addEventListener('resize', resize);
document.querySelector('#brandButton').addEventListener('click', renderMenu);

resize();
renderMenu();
requestAnimationFrame(tick);