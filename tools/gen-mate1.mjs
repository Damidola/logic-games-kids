// Генерує задачі «мат в 1 хід» (chessops, ті самі правила, що на Lichess) у mate/puzzles.json.
// Запуск: node tools/gen-mate1.mjs
// Мало фігур (3–6): випадкові розстановки — король + фігура проти короля, іноді кілька зайвих фігур.
// Середньо (7–10) і багато (11+): позиції з випадково зіграних партій, де білі можуть поставити мат.
import { Chess } from 'chessops';
import { parseFen, makeFen } from 'chessops/fen';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROLES = { r: 'rook', b: 'bishop', q: 'queen', n: 'knight', p: 'pawn' };
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];

// Усі матуючі ходи білих (перетворення — лише у ферзя, як у грі)
function mates(pos) {
  const out = [];
  for (const [from, dests] of pos.allDests()) {
    const piece = pos.board.get(from);
    for (const to of dests) {
      const promo = piece.role === 'pawn' && (to >> 3) === 7 ? 'queen' : undefined;
      const p = pos.clone(); p.play({ from, to, promotion: promo });
      if (p.isCheckmate()) out.push({ from, to, role: piece.role });
    }
  }
  return out;
}
const count = pos => [...pos.board.occupied].length;
// Задача: білі ходять, шаху білим немає, є 1–2 матуючі ходи однією фігурою
function asPuzzle(pos) {
  if (pos.turn !== 'white' || pos.isCheck() || pos.isEnd()) return null;
  const m = mates(pos);
  if (!m.length || m.length > 2 || m.some(x => x.role !== m[0].role) || m[0].role === 'king') return null;
  return { fen: makeFen(pos.toSetup()).split(' ').slice(0, 2).join(' ') + ' - - 0 1', role: m[0].role, n: count(pos) };
}
function fromFen(fen) { const s = parseFen(fen); if (s.isErr) return null; const p = Chess.fromSetup(s.value); return p.isErr ? null : p.value; }

// ---------- мало фігур: випадкова розстановка ----------
function randomSmall(role, total) {
  const board = Array(64).fill(null), put = (ch, ok = () => true) => { for (let k = 0; k < 200; k++) { const sq = rnd(64); if (!board[sq] && ok(sq)) { board[sq] = ch; return true; } } return false; };
  const noPawnRank = sq => (sq >> 3) !== 0 && (sq >> 3) !== 7;
  // чорний король частіше біля краю — там і бувають мати
  put('k', sq => Math.random() < 0.8 ? [0, 7].includes(sq & 7) || [0, 7].includes(sq >> 3) : true);
  put('K');
  put(role === 'p' ? 'P' : role.toUpperCase(), role === 'p' ? sq => (sq >> 3) >= 4 && noPawnRank(sq) : () => true);
  const extras = ['P', 'p', 'p', 'N', 'B', 'R', 'n', 'b', 'r', 'P'];
  while (board.filter(Boolean).length < total) { const ch = pick(extras); put(ch, 'Pp'.includes(ch) ? noPawnRank : () => true); }
  const rows = [];
  for (let r = 7; r >= 0; r--) { let row = '', e = 0; for (let c = 0; c < 8; c++) { const ch = board[r * 8 + c]; if (!ch) e++; else { if (e) row += e; e = 0; row += ch; } } if (e) row += e; rows.push(row); }
  return fromFen(rows.join('/') + ' w - - 0 1');
}

// ---------- багато фігур: випадкова партія ----------
function randomGame(minPieces, maxPieces) {
  let pos = Chess.default();
  for (let ply = 0; ply < 160; ply++) {
    if (pos.isEnd()) return null;
    const n = count(pos);
    if (ply > 8 && n >= minPieces && n <= maxPieces) { const p = fromFen(makeFen(pos.toSetup()).split(' ').slice(0, 2).join(' ') + ' - - 0 1'); const z = p && asPuzzle(p); if (z) return z; }
    if (n < minPieces) return null;
    // ходи: трохи частіше взяття (щоб фігур меншало) і розвиток, але без матів раніше часу
    const moves = [];
    for (const [from, dests] of pos.allDests()) for (const to of dests) moves.push({ from, to, cap: pos.board.has(to) });
    const caps = moves.filter(m => m.cap);
    const mv = caps.length && Math.random() < (n > maxPieces ? 0.7 : 0.25) ? pick(caps) : pick(moves);
    const piece = pos.board.get(mv.from);
    pos.play({ from: mv.from, to: mv.to, promotion: piece.role === 'pawn' && ((mv.to >> 3) === 7 || (mv.to >> 3) === 0) ? 'queen' : undefined });
  }
  return null;
}

const out = { few: [], mid: [], many: [] }, seen = new Set();
function add(level, z, want) {
  if (!z || seen.has(z.fen)) return false;
  const roleKey = Object.keys(ROLES).find(k => ROLES[k] === z.role);
  if (want && roleKey !== want) return false;
  seen.add(z.fen); out[level].push([z.fen, roleKey]);
  return true;
}
// Скільки задач кожного виду (ладья й ферзь з малою кількістю фігур — основна маса)
const PLAN = {
  few: { r: 260, q: 200, b: 70, n: 70, p: 80 },
  mid: { r: 60, q: 60, b: 40, n: 40, p: 30 },
  many: { r: 50, q: 60, b: 40, n: 40, p: 20 }
};
for (const [role, need] of Object.entries(PLAN.few)) {
  let got = 0, tries = 0;
  while (got < need && tries++ < 3e6) {
    // 3 фігури — ладья/ферзь; для слона, коня й пішака потрібні ще фігури
    const total = role === 'r' || role === 'q' ? pick([3, 3, 3, 4, 4, 5, 6]) : pick([4, 5, 5, 6, 6]);
    const pos = randomSmall(role, total);
    if (pos && add('few', asPuzzle(pos), role)) got++;
  }
  console.log('few', role, got, 'tries', tries);
}
for (const [level, [lo, hi]] of [['mid', [7, 10]], ['many', [11, 32]]]) {
  const need = { ...PLAN[level] }, t0 = Date.now();
  while (Object.values(need).some(v => v > 0) && Date.now() - t0 < 240000) {
    const z = randomGame(lo, hi); if (!z) continue;
    const k = Object.keys(ROLES).find(x => ROLES[x] === z.role);
    if (need[k] > 0 && add(level, z)) need[k]--;
  }
  console.log(level, out[level].length, 'left', need);
}
const file = fileURLToPath(new URL('../mate/puzzles.json', import.meta.url));
writeFileSync(file, JSON.stringify(out));
console.log('written', file, out.few.length + out.mid.length + out.many.length);
