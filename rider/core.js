/* Райдер: фізика й траса без малювання (щоб можна було перевірити рівень і без екрана).
   Байк — точка з кутом нахилу. На землі: тримаєш — газ; у повітрі: тримаєш — крутиться назад (сальто).
   Приземлитися треба колесами вниз: кут байка близький до нахилу траси. Інакше — аварія. */
export const R = 14;
// Налаштування фізики (повзунки в ⚙️). Значення за замовчуванням — DEFAULTS; P змінюється на льоту.
export const DEFAULTS = { gravity: 1400, engine: 1500, maxSpeed: 950, spin: 30, spinMax: 8, bounce: 0.15, assist: 14, airDelay: 0.35, zoom: 1,
  length: 18, hills: 80, jumps: 50, gaps: 180, seed: 1 };
export const P = { ...DEFAULTS };

// Траса: шматки ламаної (між шматками — провали), координата y — вниз. Рівні: 1 — легкий, 2 — середній, 3 — важкий
export function buildTrack(level = 2) {
  const pieces = [], gems = [];
  let cur = [], x = 0, y = 0;
  const pt = () => cur.push([x, y]);
  const curve = (len, fn) => { const x0 = x, y0 = y, n = Math.max(2, Math.round(len / 8)); for (let i = 1; i <= n; i++) { const t = i / n; x = x0 + len * t; y = y0 + fn(t); pt(); } };
  const line = (len, dy) => curve(len, t => dy * t);
  const gap = (len, dy) => { pieces.push(cur); cur = []; x += len; y += dy; pt(); };
  const ramp = (len, h) => curve(len, t => -h * t * t);
  pt();
  line(500, 0);                                                    // старт
  if (level === 1) {
    curve(1200, t => -45 * Math.sin(t * Math.PI * 2 * 2));         // лагідні пагорби
    curve(700, t => 180 * (1 - Math.cos(t * Math.PI)) / 2);         // спуск
    line(200, 0); ramp(220, 60); gap(90, 30); line(400, 90);         // маленький стрибок
    line(300, 0);
    curve(700, t => -16 * (1 - Math.cos(t * Math.PI * 2 * 5)) / 2);     // купини
    line(250, 0); ramp(260, 110); gap(150, 40); line(500, 160);     // стрибок для першого сальто
    line(300, 0);
    curve(800, t => 110 * Math.sin(t * Math.PI));                   // яма
    line(700, 0);
  } else if (level === 2) {
    curve(1100, t => -70 * Math.sin(t * Math.PI * 2 * 2));          // пагорби
    curve(700, t => 260 * (1 - Math.cos(t * Math.PI)) / 2);         // спуск
    line(150, 0); ramp(260, 110);                                    // трамплін
    gap(200, 50); line(450, 170);                                    // провал і приземлення на схил
    line(250, 0);
    curve(800, t => -24 * (1 - Math.cos(t * Math.PI * 2 * 6)) / 2);     // купини
    line(250, 0); ramp(300, 190);                                    // великий трамплін — для сальто
    gap(260, 40); line(650, 330);                                    // довгий політ, приземлення на схил
    line(200, 0);
    for (let k = 0; k < 4; k++) { line(170, 0); gap(8, 55); }       // сходинки вниз
    line(200, 0);
    curve(900, t => 170 * Math.sin(t * Math.PI));                   // яма
    line(200, 0); ramp(260, 120); gap(180, 30); line(420, 150);      // ще один стрибок
    line(700, 0);
  } else if (level === 4) {
    randomTrack(curve, line, gap, ramp);
  } else {
    curve(1200, t => -80 * Math.sin(t * Math.PI * 2 * 2.5));        // круті пагорби
    curve(600, t => 320 * (1 - Math.cos(t * Math.PI)) / 2);
    line(120, 0); ramp(280, 150); gap(300, 60); line(900, 380);      // довгий провал і довгий схил для приземлення
    curve(900, t => -24 * (1 - Math.cos(t * Math.PI * 2 * 6)) / 2);     // часті купини
    line(200, 0); ramp(320, 230); gap(340, 20); line(700, 380);      // величезний трамплін — подвійне сальто
    for (let k = 0; k < 6; k++) { line(140, 0); gap(8, 60); }       // сходинки
    line(150, 0); ramp(200, 90); gap(160, -20); line(150, 0); ramp(200, 90); gap(160, 40); line(400, 150); // два стрибки поспіль
    curve(900, t => 220 * Math.sin(t * Math.PI));                   // глибока яма
    line(300, 0); ramp(300, 130); gap(240, 30); line(600, 260);
    line(700, 0);
  }
  pieces.push(cur);
  const track = { pieces, gems, finish: x - 450, bottom: Math.max(...pieces.flat().map(p => p[1])) + 700 };
  placeGems(track);
  return track;
}

// Випадкова траса з повзунків: довжина, висота пагорбів, частота стрибків, ширина провалів (seed — «нова траса»)
// Випадкова траса з повзунків: довжина, висота пагорбів, частота стрибків, ширина провалів (seed — «нова траса»).
// Будується з тих самих шматків, що й готові траси, з обмеженням крутизни — щоб її можна було проїхати.
function randomTrack(curve, line, gap, ramp) {
  let a = (P.seed * 2654435761) >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const H = P.hills, J = P.jumps / 100, GAP = P.gaps, STEEP = 0.6; // найбільший нахил ≈ 31°
  for (let i = 0; i < P.length; i++) {
    const r = rnd();
    line(150 + rnd() * 150, 0);                  // рівна ділянка між перешкодами
    if (r < J * 0.65 && i > 0) {                 // трамплін, провал і довгий схил для приземлення
      const h = 80 + rnd() * 110, g = GAP * (0.5 + rnd() * 0.5), land = 500 + g * 1.6;
      ramp(260 + rnd() * 60, h); gap(g, 20 + rnd() * 30); line(land, land * 0.45);
    } else if (r < J * 0.8 && i > 0) {           // сходинки вниз
      for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) { line(160, 0); gap(8, 30 + rnd() * 25); }
    } else if (rnd() < 0.55) {                   // пагорби
      const len = 700 + rnd() * 600, n = 1 + Math.floor(rnd() * 2);
      const amp = Math.min(H * (0.8 + rnd() * 0.6), STEEP * len / (Math.PI * n));
      curve(len, t => -amp * (1 - Math.cos(t * Math.PI * 2 * n)) / 2); // плавно починається й закінчується
    } else if (rnd() < 0.5) {                    // яма
      const len = 700 + rnd() * 400, d = Math.min(H * (1 + rnd()), STEEP * 0.8 * len / Math.PI);
      curve(len, t => d * (1 - Math.cos(t * Math.PI * 2)) / 2);
    } else {                                     // купини
      const amp = Math.min(14, H * 0.2); // на повній швидкості високі купини працюють як трампліни
      curve(800, t => -amp * (1 - Math.cos(t * Math.PI * 2 * 4)) / 2);
    }
  }
  line(700, 0);
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
  for (let x = 900; x < track.finish - 300; x += 1400) { const g = ground(track, x); if (g) track.gems.push({ x, y: g.y - 40, got: false }); }
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

/* Байк — два колеса (точки з радіусом) і жорстка рама між ними (Верле-інтеграція).
   Колеса самі котяться, підстрибують на купинах і відриваються від землі — ніяких «рейок».
   На землі тримаєш — крутиться заднє колесо; у повітрі тримаєш — байк обертається назад (сальто),
   оберт триває за інерцією. Аварія — коли об землю вдаряється голова вершника або рама. */
export const WR = 9, WB = 38; // радіус колеса й відстань між колесами

export function newBike() {
  const a = { x: 40, y: -WR, px: 40, py: -WR }, b = { x: 40 + WB, y: -WR, px: 40 + WB, py: -WR };
  return { A: a, B: b, x: 40 + WB / 2, y: -WR, a: 0, s: 0, vx: 0, vy: 0, air: false, rot: 0, flips: 0, gems: 0, dead: false, done: false, gA: false, gB: false };
}

// Найближча точка землі до (x, y): { d, nx, ny, tx, ty } або null
function nearest(track, x, y, reach) {
  let best = null;
  for (const p of track.pieces) {
    if (x + reach < p[0][0] || x - reach > p[p.length - 1][0]) continue;
    let lo = 0, hi = p.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p[m][0] <= x - reach) lo = m; else hi = m; }
    for (let i = lo; i < p.length - 1 && p[i][0] <= x + reach; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[i + 1], dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2));
      const qx = x1 + dx * t, qy = y1 + dy * t, d = Math.hypot(x - qx, y - qy);
      if (!best || d < best.d) {
        const l = Math.sqrt(L2);
        // нормаль — завжди «вгору» від поверхні
        let nx = d > 1e-6 ? (x - qx) / d : dy / l, ny = d > 1e-6 ? (y - qy) / d : -dx / l;
        if (ny > 0 && t > 0 && t < 1) { nx = -nx; ny = -ny; }
        best = { d, nx, ny, tx: dx / l, ty: dy / l, qx, qy };
      }
    }
  }
  return best;
}
// Колесо проти землі: виштовхнути назовні, прибрати швидкість «у землю»
function collide(track, w) {
  const g = nearest(track, w.x, w.y, WR + 2);
  if (!g || g.d >= WR) return g && g.d < WR + 1.5;
  let vx = w.x - w.px, vy = w.y - w.py;
  w.x = g.qx + g.nx * WR; w.y = g.qy + g.ny * WR;
  const vn = vx * g.nx + vy * g.ny;
  if (vn < 0) { vx -= (1 + P.bounce) * vn * g.nx; vy -= (1 + P.bounce) * vn * g.ny; } // відскок коліс
  w.px = w.x - vx; w.py = w.y - vy;
  return true;
}
function rotate(b, th) { // повернути обидва колеса навколо центру (зміщення без зміни «минулого» = кутова швидкість)
  const cx = (b.A.x + b.B.x) / 2, cy = (b.A.y + b.B.y) / 2, hx = (b.B.x - b.A.x) / 2, hy = (b.B.y - b.A.y) / 2;
  b.B.x = cx + hx - th * hy; b.B.y = cy + hy + th * hx; b.A.x = cx - hx + th * hy; b.A.y = cy - hy - th * hx;
}

/* Крок фізики; повертає подію: 'flip' | 'crash' | 'finish' | 'gem' | null */
export function step(track, b, hold, dt) {
  if (b.dead || b.done) return null;
  let ev = null;
  const A = b.A, B = b.B, wasAir = b.air;
  const va = [(A.x - A.px) / dt, (A.y - A.py) / dt], vb = [(B.x - B.px) / dt, (B.y - B.py) / dt];
  const hx = (B.x - A.x) / 2, hy = (B.y - A.y) / 2, h2 = hx * hx + hy * hy;
  const omega = ((vb[0] - va[0]) * -hy + (vb[1] - va[1]) * hx) / (2 * h2);
  // рух: інерція + гравітація
  for (const w of [A, B]) {
    const vx = w.x - w.px, vy = w.y - w.py;
    w.px = w.x; w.py = w.y;
    const damp = (w === A ? b.gA : b.gB) ? 0.9995 : 1;
    w.x += vx * damp; w.y += vy * damp + P.gravity * dt * dt;
  }
  const fx = hx * 2 / WB, fy = hy * 2 / WB;
  if (hold && (b.gA || b.gB)) { // газ: колеса штовхають байк уздовж рами
    const v = (va[0] + vb[0]) / 2 * fx + (va[1] + vb[1]) / 2 * fy;
    const E = P.engine;
    if (v < P.maxSpeed) { A.x += fx * E * dt * dt; A.y += fy * E * dt * dt; B.x += fx * E * dt * dt * 0.6; B.y += fy * E * dt * dt * 0.6; }
  }
  b.airT = b.air ? (b.airT || 0) + dt : 0;
  if (b.air) {
    // коротенькі підскоки на купинах не крутять байк — лише справжній політ
    if (hold && b.airT > P.airDelay && omega > -P.spinMax) rotate(b, -P.spin * dt * dt); // крутимо назад
    else if (!hold || b.airT <= P.airDelay) { // відпустив (або ледь відірвався): оберт гасне, байк м'яко повертається вздовж польоту (легше приземлитися)
      const vx = (va[0] + vb[0]) / 2, vy = (va[1] + vb[1]) / 2, d = norm(Math.atan2(vy, vx) - Math.atan2(hy, hx));
      rotate(b, (Math.max(-1, Math.min(1, d)) * P.assist - omega * P.assist / 4.7) * dt * dt);
    }
  }
  // рама жорстка; колеса не провалюються в землю
  let gA = false, gB = false;
  for (let k = 0; k < 4; k++) {
    gA = collide(track, A) || gA; gB = collide(track, B) || gB;
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, diff = (d - WB) / d / 2;
    A.x += dx * diff; A.y += dy * diff; B.x -= dx * diff; B.y -= dy * diff;
  }
  b.gA = gA; b.gB = gB; b.air = !gA && !gB;
  const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2, ang = Math.atan2(B.y - A.y, B.x - A.x);
  if (b.air) b.rot += norm(ang - b.a);
  if (wasAir && !b.air) { // приземлились
    const full = Math.floor((Math.abs(b.rot) + 0.9) / (2 * Math.PI));
    if (full > 0) { b.flips += full; ev = 'flip'; }
    b.rot = 0;
  }
  b.x = cx; b.y = cy; b.a = ang;
  b.vx = ((A.x - A.px) + (B.x - B.px)) / 2 / dt; b.vy = ((A.y - A.py) + (B.y - B.py)) / 2 / dt;
  b.s = b.vx * Math.cos(ang) + b.vy * Math.sin(ang);
  // голова й рама вершника не мають торкатися землі
  const ux = Math.sin(ang), uy = -Math.cos(ang); // «вгору» від рами
  for (const [px, py, r] of [[cx + ux * 30, cy + uy * 30, 7], [cx + ux * 16, cy + uy * 16, 6], [cx, cy, 3]]) {
    const g = nearest(track, px, py, r + 2);
    if (g && g.d < r) { b.dead = true; return 'crash'; }
  }
  if (cy > track.bottom) { b.dead = true; return 'crash'; }
  for (const gm of track.gems) if (!gm.got && Math.hypot(gm.x - cx, gm.y - cy) < 42) { gm.got = true; b.gems++; ev = ev || 'gem'; }
  if (cx >= track.finish) { b.done = true; return 'finish'; }
  return ev;
}
