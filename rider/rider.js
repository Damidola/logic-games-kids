/* Райдер: чорно-біла траса. Тримай палець — байк їде; у повітрі — крутить сальто.
   Приземлився не колесами — аварія, і заїзд починається знову. */
import { buildTrack, newBike, step, ground, R } from './core.js';

const LG = window.LG, cv = document.getElementById('game'), ctx = cv.getContext('2d');
// Рівні: кнопки внизу
const lvBox = document.getElementById('levels');
let W = 0, H = 0, S = 1, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  S = Math.max(900 / W, 620 / H); // світових одиниць в одному пікселі: видно далі, байк менший
}
window.addEventListener('resize', resize); resize();

let track, bike, cam, hold = false, started = false, shards = [], popups = [], deadAt = 0, finished = false;
let level = +LG.store.get('rider:level', 1);
const best = () => LG.store.get('rider:best' + level, null);
function reset() {
  track = buildTrack(level); bike = newBike(); cam = { x: bike.x, y: bike.y, look: 0 };
  shards = []; popups = []; deadAt = 0; finished = false;
}
reset();

// ---------- керування: тримати будь-де на екрані (або пробіл) ----------
const down = e => { hold = true; started = true; if (e && e.cancelable) e.preventDefault(); };
const up = () => { hold = false; };
cv.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
window.addEventListener('keydown', e => { if (e.code === 'Space') down(e); });
window.addEventListener('keyup', e => { if (e.code === 'Space') up(); });
document.addEventListener('touchmove', e => { if (!e.target.closest('.lg-modal')) e.preventDefault(); }, { passive: false });

// ---------- ігровий цикл ----------
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000); last = now;
  while (acc >= 1 / 120) {
    acc -= 1 / 120;
    const ev = step(track, bike, hold && !finished, 1 / 120);
    if (ev === 'flip') { popups.push({ x: bike.x, y: bike.y - 60, t: 0, text: 'САЛЬТО!' }); LG.play('place'); }
    if (ev === 'gem') LG.play('tap');
    if (ev === 'crash') crash();
    if (ev === 'finish') finish();
  }
  if (deadAt && now - deadAt > 1100) reset();
  draw(now);
  requestAnimationFrame(frame);
}
function crash() {
  deadAt = performance.now();
  LG.play('error');
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, v = 150 + Math.random() * 450;
    shards.push({ x: bike.x, y: bike.y, vx: Math.cos(a) * v + bike.vx * 0.3, vy: Math.sin(a) * v - 200, r: Math.random() * 6, s: 4 + Math.random() * 7 });
  }
}
function finish() {
  finished = true;
  const total = track.gems.length, b = best();
  const score = bike.flips * 10 + bike.gems;
  if (!b || score > b.score) LG.store.set('rider:best' + level, { score, flips: bike.flips, gems: bike.gems });
  LG.win(`Фініш! Сальто: ${bike.flips}, діамантів: ${bike.gems} з ${total}.`, { reward: true, onAgain: () => { reset(); hold = false; } });
}

// ---------- малювання ----------
const toScreen = (x, y) => [(x - cam.x - cam.look) / S + W * 0.33, (y - cam.y) / S + H * 0.5];
function draw(now) {
  if (!bike.dead) { cam.x += (bike.x - cam.x) * 0.2; cam.y += (bike.y - cam.y) * 0.06; cam.look += (Math.max(0, bike.air ? bike.vx : bike.s) * 0.25 - cam.look) * 0.03; } // дивимось трохи вперед
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // далекі «гори» — ледь сірі, повільніші за трасу
  ctx.fillStyle = '#0d0d0d';
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 20; sx += 20) { const wx = cam.x * 0.3 + sx * S; ctx.lineTo(sx, H * 0.62 + Math.sin(wx / 260) * 40 + Math.sin(wx / 90) * 12); }
  ctx.lineTo(W, H); ctx.fill();

  const x0 = cam.x + cam.look - W * 0.33 * S - 50, x1 = cam.x + cam.look + W * 0.67 * S + 50;
  // земля: темна заливка й біла лінія з сяйвом
  for (const p of track.pieces) {
    if (p[p.length - 1][0] < x0 || p[0][0] > x1) continue;
    const pts = p.filter(([x]) => x > x0 - 20 && x < x1 + 20);
    if (pts.length < 2) continue;
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    const [ex] = toScreen(pts[pts.length - 1][0], 0), [bx] = toScreen(pts[0][0], 0);
    ctx.lineTo(ex, H + 10); ctx.lineTo(bx, H + 10); ctx.closePath();
    ctx.fillStyle = '#141414'; ctx.fill();
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const [sx, sy] = toScreen(x, y); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#fff';
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
  }
  // фініш — шаховий прапорець
  { const g = ground(track, track.finish); if (g) { const [fx, fy] = toScreen(track.finish, g.y);
    ctx.fillStyle = '#fff'; ctx.fillRect(fx - 2, fy - 120 / S * 0.9, 4, 120 / S * 0.9);
    const c = 12; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#000'; ctx.fillRect(fx + 2 + i * c, fy - 120 / S * 0.9 + j * c, c, c); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(fx + 2, fy - 120 / S * 0.9, 4 * c, 3 * c); } }
  // діаманти
  for (const gm of track.gems) {
    if (gm.got || gm.x < x0 || gm.x > x1) continue;
    const [gx, gy] = toScreen(gm.x, gm.y), bob = Math.sin(now / 250 + gm.x) * 3, r = 9;
    ctx.beginPath(); ctx.moveTo(gx, gy - r * 1.4 + bob); ctx.lineTo(gx + r, gy + bob); ctx.lineTo(gx, gy + r * 1.4 + bob); ctx.lineTo(gx - r, gy + bob); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
  }
  if (!bike.dead) drawBike(); else drawShards();
  // сальто — спливаючий напис
  popups = popups.filter(p => (p.t += 1 / 60) < 1.1);
  for (const p of popups) { const [px, py] = toScreen(p.x, p.y); ctx.globalAlpha = 1 - p.t / 1.1; ctx.fillStyle = '#fff'; ctx.font = '900 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.text, px, py - p.t * 40); ctx.globalAlpha = 1; }
  // лічильники: великий — сальто; праворуч — діаманти
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 64px system-ui, sans-serif';
  ctx.fillText(String(bike.flips), W / 2, 84);
  ctx.textAlign = 'right'; ctx.font = '800 20px system-ui, sans-serif';
  ctx.fillText(`◆ ${bike.gems}/${track.gems.length}`, W - 14, 34);
  const b = best(); if (b) { ctx.textAlign = 'left'; ctx.globalAlpha = .6; ctx.fillText(`🏁 ${b.flips} · ◆ ${b.gems}`, 14, 34); ctx.globalAlpha = 1; }
  // прогрес траси
  ctx.fillStyle = '#333'; ctx.fillRect(14, H - 12, W - 28, 4);
  ctx.fillStyle = '#fff'; ctx.fillRect(14, H - 12, (W - 28) * Math.min(1, bike.x / track.finish), 4);
  if (!started) {
    ctx.textAlign = 'center'; ctx.font = '800 22px system-ui, sans-serif'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now / 300);
    ctx.fillText('Тримай палець — поїхали!', W / 2, H * 0.3); ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('У повітрі тримай — буде сальто', W / 2, H * 0.3 + 28); ctx.globalAlpha = 1;
  }
  if (bike.dead) { ctx.textAlign = 'center'; ctx.font = '900 40px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('Ой! Ще раз 🔄', W / 2, H * 0.32); }
}
function drawBike() {
  const [sx, sy] = toScreen(bike.x, bike.y), k = 1 / S;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(bike.a);
  ctx.strokeStyle = '#fff'; ctx.fillStyle = '#000'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
  ctx.translate(0, -5 * k); // колеса — на лінії між їхніми центрами (фізика: WB = 38, радіус 9)
  const wr = 9 * k, wy = 5 * k, wx = 19 * k;
  for (const x of [-wx, wx]) { ctx.beginPath(); ctx.arc(x, wy, wr, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  // рама
  ctx.beginPath(); ctx.moveTo(-wx, wy); ctx.lineTo(-4 * k, -6 * k); ctx.lineTo(12 * k, -6 * k); ctx.lineTo(wx, wy);
  ctx.moveTo(12 * k, -6 * k); ctx.lineTo(10 * k, -16 * k); ctx.lineTo(16 * k, -18 * k); ctx.stroke();
  // вершник
  ctx.beginPath(); ctx.moveTo(-2 * k, -8 * k); ctx.lineTo(2 * k, -24 * k); ctx.lineTo(12 * k, -17 * k); ctx.moveTo(-2 * k, -8 * k); ctx.lineTo(6 * k, -2 * k); ctx.stroke();
  ctx.beginPath(); ctx.arc(3 * k, -30 * k, 5 * k, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
}
function drawShards() {
  for (const s of shards) {
    s.vy += 1400 / 60; s.x += s.vx / 60; s.y += s.vy / 60; s.r += 0.2;
    const [x, y] = toScreen(s.x, s.y);
    ctx.save(); ctx.translate(x, y); ctx.rotate(s.r); ctx.fillStyle = '#fff'; ctx.fillRect(-s.s / 2, -s.s / 4, s.s, s.s / 2); ctx.restore();
  }
}
requestAnimationFrame(frame);
function paintLevels() { lvBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.l === level))); }
lvBox.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  level = +b.dataset.l; LG.store.set('rider:level', level); LG.play('tap'); paintLevels(); reset(); started = false; hold = false;
});
paintLevels();
