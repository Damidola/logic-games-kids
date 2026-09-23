/* Райдер: фізика й траса без малювання (щоб можна було перевірити рівень і без екрана).
   Байк — точка з кутом нахилу. На землі: тримаєш — газ; у повітрі: тримаєш — крутиться назад (сальто).
   Приземлитися треба колесами вниз: кут байка близький до нахилу траси. Інакше — аварія. */
export const G = 1400, ACCEL = 820, MAX_SPEED = 800, ROLL = 0.12, SPIN = 8.5, R = 14, LAND_TOL = 0.95;

// Траса: шматки ламаної (між шматками — провали), координата y — вниз
export function buildTrack() {
  const pieces = [], gems = [];
  let cur = [], x = 0, y = 0;
  const pt = () => cur.push([x, y]);
  const curve = (len, fn) => { const x0 = x, y0 = y, n = Math.max(2, Math.round(len / 8)); for (let i = 1; i <= n; i++) { const t = i / n; x = x0 + len * t; y = y0 + fn(t); pt(); } };
  const line = (len, dy) => curve(len, t => dy * t);
  const gap = (len, dy) => { pieces.push(cur); cur = []; x += len; y += dy; pt(); };
  pt();
  line(500, 0);                                                    // старт
  curve(1100, t => -70 * Math.sin(t * Math.PI * 2 * 2)); // пагорби
  curve(700, t => 260 * (1 - Math.cos(t * Math.PI)) / 2); // спуск
  line(150, 0); curve(260, t => -110 * t * t);                     // трамплін
  gap(200, 50); line(450, 170);                    // провал і приземлення на схил
  line(250, 0);
  curve(800, t => -24 * Math.abs(Math.sin(t * Math.PI * 6)));      // купини
  line(250, 0); curve(300, t => -190 * t * t);                     // великий трамплін — для сальто
  gap(260, 40); line(650, 330);    // довгий політ, приземлення на схил
  line(200, 0);
  for (let k = 0; k < 4; k++) { line(170, 0); gap(8, 55); }         // сходинки вниз
  line(200, 0);
  curve(900, t => 170 * Math.sin(t * Math.PI));       // яма
  line(200, 0); curve(260, t => -120 * t * t); gap(180, 30); line(420, 150); // ще один стрибок
  line(700, 0);                                                    // фініш
  pieces.push(cur);
  const track = { pieces, gems, finish: x - 450, bottom: Math.max(...pieces.flat().map(p => p[1])) + 700 };
  placeGems(track);
  return track;
}

// Діаманти ставимо туди, де байк справді пролітає (симуляція заїзду з газом) і на вершини пагорбів
function placeGems(track) {
  const b = newBike(), air = [];
  let flight = null;
  for (let t = 0; t < 60 && !b.done && !b.dead; t += 1 / 60) {
    step(track, b, !b.air, 1 / 60);
    if (b.air) (flight = flight || []).push([b.x, b.y]);
    else if (flight) { if (flight.length > 12) air.push(flight); flight = null; }
  }
  for (const f of air) for (const k of f.length > 30 ? [0.3, 0.6] : [0.5]) { const [x, y] = f[Math.floor(f.length * k)]; track.gems.push({ x, y, got: false }); }
  for (const x of [1000, 1270, 4300, 8150]) { const g = ground(track, x); if (g) track.gems.push({ x, y: g.y - 40, got: false }); }
  track.gems.sort((a, c) => a.x - c.x);
}

// Висота й нахил землі під x (null — провал)
export function ground(track, x) {
  for (const p of track.pieces) {
    if (x < p[0][0] || x > p[p.length - 1][0]) continue;
    let lo = 0, hi = p.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= x) lo = m; else hi = m; }
    const [x1, y1] = p[lo], [x2, y2] = p[hi], t = (x - x1) / (x2 - x1 || 1);
    return { y: y1 + (y2 - y1) * t, a: Math.atan2(y2 - y1, x2 - x1) };
  }
  return null;
}
const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export function newBike() { return { x: 60, y: -R, s: 0, vx: 0, vy: 0, a: 0, air: false, spin: 0, rot: 0, flips: 0, gems: 0, dead: false, done: false }; }

/* Крок фізики; повертає подію: 'flip' | 'crash' | 'finish' | 'gem' | null */
export function step(track, b, hold, dt) {
  if (b.dead || b.done) return null;
  let ev = null;
  if (!b.air) {
    const g0 = ground(track, b.x);
    const a = g0 ? g0.a : b.a;
    b.s += (G * Math.sin(a) + (hold ? ACCEL : 0) - ROLL * b.s) * dt;
    b.s = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, b.s));
    const nx = b.x + b.s * Math.cos(a) * dt, ny = b.y + b.s * Math.sin(a) * dt;
    const g1 = ground(track, nx);
    if (!g1 || g1.y - R - ny > 3) { // земля пішла з-під коліс — летимо
      b.air = true; b.vx = b.s * Math.cos(a); b.vy = b.s * Math.sin(a); b.x = nx; b.y = ny; b.rot = 0;
    } else { b.x = nx; b.y = g1.y - R; b.a = g1.a; }
  } else {
    b.vy += G * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (hold) b.spin = -SPIN;
    else { // відпустив — байк сам плавно стає вздовж польоту (так легше приземлитися)
      b.spin *= 0.85;
      const d = norm(Math.atan2(b.vy, b.vx) - b.a);
      b.spin += Math.max(-3, Math.min(3, d * 4)) * 0.15;
    }
    b.a += b.spin * dt; b.rot += b.spin * dt;
    const g = ground(track, b.x);
    if (g && b.y >= g.y - R) {
      if (Math.abs(norm(b.a - g.a)) < LAND_TOL) {
        const full = Math.floor((Math.abs(b.rot) + 0.9) / (2 * Math.PI));
        if (full > 0) { b.flips += full; ev = 'flip'; }
        b.air = false; b.y = g.y - R; b.a = g.a; b.spin = 0;
        b.s = Math.max(0, b.vx * Math.cos(g.a) + b.vy * Math.sin(g.a));
      } else { b.dead = true; return 'crash'; }
    }
    if (b.y > track.bottom) { b.dead = true; return 'crash'; }
  }
  for (const gm of track.gems) if (!gm.got && Math.hypot(gm.x - b.x, gm.y - b.y) < 42) { gm.got = true; b.gems++; ev = ev || 'gem'; }
  if (b.x >= track.finish) { b.done = true; return 'finish'; }
  return ev;
}
