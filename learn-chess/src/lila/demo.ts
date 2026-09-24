/* logic-games-kids: приклад на початку кожного етапу — пояснення й хід за ходом із підписами та стрілками,
   як у «Шахових задачах». Фігури переставляються без перевірки правил (кроки прописані вручну). */
import type { DrawShape } from '@lichess-org/chessground/draw';

import { makeAppleShape } from './apple';
import { move as moveSound, take } from './sound';
import * as timeouts from './timeouts';

export interface DemoStep {
  say?: string;
  arrows?: string; // 'e2e4 d4:red' — стрілки й кружечки (колір після двокрапки)
  move?: string; // 'e1g1 h1f1' — кілька переміщень разом (рокіровка)
  ep?: Key; // взяття на проході: цей пішак зникає
  promo?: Role;
  check?: Color | false;
  wait?: number;
}
export interface Demo {
  fen: string;
  apples?: string;
  steps: DemoStep[];
}

export const DEMOS: Record<string, Demo> = {
  capture: {
    fen: '8/8/8/3n3b/8/8/8/3R4',
    steps: [
      { say: 'Бити — це стати на клітинку фігури суперника. Та фігура зникає з дошки.', arrows: 'd1d5:red', wait: 3000 },
      { move: 'd1d5' },
      { say: 'Ще одна!', arrows: 'd5h5:red', wait: 1500 }, { move: 'd5h5' },
    ],
  },
  protection: {
    fen: '4r3/8/8/8/4B3/8/8/8',
    steps: [
      { say: 'Чорна тура нападає на нашого слона!', arrows: 'e8e4:red', wait: 2600 },
      { say: 'Рятуємо: відводимо слона туди, де його не б’ють.', arrows: 'e4c6', wait: 2400 },
      { move: 'e4c6' },
      { say: 'Урятували! А ще слон тепер сам нападає на туру.', arrows: 'c6e8', wait: 2200 },
    ],
  },
  combat: {
    fen: '8/8/4p3/3n4/b7/8/8/3Q4',
    steps: [
      { say: 'Бий фігури суперника, але не підставляй свої!', wait: 2400 },
      { say: 'Коня захищає пішак: поб’ємо — і втратимо ферзя.', arrows: 'd1d5:yellow e6d5:red', wait: 3000 },
      { say: 'А слона ніхто не захищає — беремо!', arrows: 'd1a4', wait: 2000 }, { move: 'd1a4' },
    ],
  },
  check1: {
    fen: '4k3/8/8/8/8/8/8/R7',
    steps: [
      { say: 'Шах — це напад на короля. Суперник мусить рятувати короля!', wait: 2600 },
      { say: 'Шах турою можна поставити так… або так!', arrows: 'a1a8 a1e1', wait: 2800 },
      { move: 'a1e1', check: 'black' },
      { say: 'Шах! Король під ударом.', arrows: 'e1e8:yellow', wait: 2000 },
    ],
  },
  outOfCheck: {
    fen: '4r2k/8/8/1B6/R7/8/8/4K3',
    steps: [
      { say: 'Шах! Чорна тура нападає на нашого короля.', arrows: 'e8e1:yellow', check: 'white', wait: 2600 },
      { say: 'Урятуватися можна трьома способами. Утекти королем…', arrows: 'e1d1 e1d2 e1f1 e1f2', wait: 2600 },
      { say: '…закритися іншою фігурою…', arrows: 'a4e4:blue', wait: 2200 },
      { say: '…або побити того, хто шахує. Побити — найкраще!', arrows: 'b5e8:red', wait: 2600 },
      { move: 'b5e8', check: false, say: 'Король урятований — і ще виграли туру!' },
    ],
  },
  checkmate1: {
    fen: '7k/6pp/8/8/8/8/8/R5K1',
    steps: [
      { say: 'Мат — це шах, від якого нікуди подітися: ні втекти, ні побити, ні закритися.', wait: 3200 },
      { say: 'Тура йде на останній ряд…', arrows: 'a1a8', wait: 1800 },
      { move: 'a1a8', check: 'black' },
      { say: 'Мат! Королю заважають власні пішаки. Хто поставив мат — виграв!', arrows: 'a8h8:yellow', wait: 2600 },
    ],
  },
  setup: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
    steps: [
      { say: 'Ось як стоять фігури на початку гри.', wait: 2200 },
      { say: 'Тури — по кутах.', arrows: 'a1 h1 a8 h8', wait: 1800 },
      { say: 'Поруч із турами — коні.', arrows: 'b1 g1 b8 g8', wait: 1800 },
      { say: 'Далі — слони.', arrows: 'c1 f1 c8 f8', wait: 1800 },
      { say: 'Ферзь любить свій колір: білий ферзь — на білій клітинці.', arrows: 'd1 d8', wait: 2400 },
      { say: 'Король — поруч із ферзем.', arrows: 'e1 e8', wait: 1800 },
      { say: 'А попереду — пішаки.', arrows: 'a2 b2 c2 d2 e2 f2 g2 h2', wait: 1800 },
    ],
  },
  castling: {
    fen: '8/8/8/8/8/8/PPPPPPPP/R3K2R',
    steps: [
      { say: 'Рокіровка — особливий хід: король іде на дві клітинки до тури, а тура перескакує через нього.', arrows: 'e1g1 h1f1:blue', wait: 3600 },
      { move: 'e1g1 h1f1' },
      { say: 'Король сховався за пішаками! Можна, якщо король і тура ще не ходили, а між ними пусто.', wait: 3200 },
    ],
  },
  enpassant: {
    fen: '8/2p5/8/3P4/8/8/8/8',
    steps: [
      { say: 'Чорний пішак стрибає на дві клітинки — повз нашого пішака.', wait: 1600 },
      { move: 'c7c5' },
      { say: 'Одразу після цього його можна взяти «на проході» — ніби він ступив лише на одну!', arrows: 'd5c6:red', wait: 3200 },
      { move: 'd5c6', ep: 'c5' },
      { say: 'Взяли! Але лише одразу, наступним ходом.', wait: 1800 },
    ],
  },
  stalemate: {
    fen: 'k7/8/8/8/8/8/8/2Q1K3',
    steps: [
      { say: 'Пат — коли королю не шах, але ходити нікуди. Це нічия: ніхто не виграв.', wait: 3000 },
      { say: 'Ферзь іде на c7…', arrows: 'c1c7', wait: 1600 }, { move: 'c1c7' },
      { say: 'Шаху немає, але всі клітинки біля короля під ударом — ходити нікуди. Пат!', arrows: 'a7:red b7:red b8:red', wait: 3200 },
    ],
  },
  value: {
    fen: '8/8/4q3/1r6/3N4/8/8/8',
    steps: [
      { say: 'Фігури мають різну цінність: пішак — 1, кінь і слон — 3, тура — 5, ферзь — 9.', wait: 3200 },
      { say: 'Кінь може побити туру (5) або ферзя (9). Кого краще?', arrows: 'd4b5 d4e6', wait: 2800 },
      { say: 'Ферзя — він дорожчий!', arrows: 'd4e6:red', wait: 1600 }, { move: 'd4e6' },
    ],
  },
  check2: {
    fen: '4k3/8/8/8/8/6N1/8/8',
    steps: [
      { say: 'Шах за два ходи: перший хід готує, другий — шах.', wait: 2600 },
      { say: 'Кінь підкрадається…', arrows: 'g3e4', wait: 1600 }, { move: 'g3e4' },
      { say: '…і стрибає з шахом!', arrows: 'e4f6', wait: 1600 }, { move: 'e4f6', check: 'black' },
      { say: 'Шах!', arrows: 'f6e8:yellow', wait: 1600 },
    ],
  },
};

const shape = (s: string): DrawShape => {
  const [u, brush = 'green'] = s.split(':');
  return u.length === 2 ? { orig: u as Key, brush } : { orig: u.slice(0, 2) as Key, dest: u.slice(2, 4) as Key, brush };
};

// Програє приклад на дошці; alive() — чи ще показуємо (інакше тихо зупиняємося)
export function playDemo(g: CgApi, d: Demo, say: (t: string) => void, alive: () => boolean, done: () => void): void {
  let apples = d.apples ? d.apples.split(' ') : [];
  const draw = (arrows?: string) => {
    g.setAutoShapes(apples.map(k => makeAppleShape(k as Key)));
    g.setShapes(arrows ? arrows.split(' ').map(shape) : []);
  };
  g.set({
    fen: d.fen, orientation: 'white', turnColor: 'white', lastMove: undefined, selected: undefined, check: false,
    movable: { color: undefined, dests: new Map() },
  });
  draw();
  let i = 0;
  const next = () => {
    if (!alive()) return;
    const s = d.steps[i++];
    if (!s) return done();
    if (s.say) say(s.say);
    if (s.move) {
      let last: Key[] = [];
      for (const u of s.move.split(' ')) {
        const o = u.slice(0, 2) as Key, t = u.slice(2, 4) as Key, pc = g.state.pieces.get(o);
        if (!pc) continue;
        const to = s.promo ? { role: s.promo, color: pc.color, promoted: true } : pc;
        if (pc.role === 'knight' && !knightMidBusy(g, o, t)) { // кінь — «Г»: спершу дві клітинки прямо, потім одна вбік
          const a = (o.charCodeAt(0) - 97) + 8 * (+o[1] - 1), b = (t.charCodeAt(0) - 97) + 8 * (+t[1] - 1);
          const dr = (b >> 3) - (a >> 3), df = (b & 7) - (a & 7), m = a + (Math.abs(dr) === 2 ? 8 * dr : df);
          const mid = ('abcdefgh'[m & 7] + ((m >> 3) + 1)) as Key, keep = g.state.pieces.get(mid);
          g.setPieces(new Map([[o, undefined], [mid, pc]]));
          timeouts.setTimeout(() => g.setPieces(new Map([[mid, keep], [t, to]])), 260);
        } else g.setPieces(new Map([[o, undefined], [t, to]]));
        if (!last.length) last = [o, t];
        if (apples.includes(t)) { apples = apples.filter(a => a !== t); take(); }
      }
      if (s.ep) g.setPieces(new Map([[s.ep, undefined]]));
      g.set({ lastMove: last });
      moveSound();
    }
    if (s.check !== undefined) g.set({ check: s.check });
    draw(s.arrows);
    timeouts.setTimeout(next, s.wait ?? (s.move ? 1300 : 2400));
  };
  timeouts.setTimeout(next, 200);
}

// Клітинка на згині «Г» зайнята — тоді кінь просто перестрибує
function knightMidBusy(g: CgApi, o: Key, t: Key): boolean {
  const a = (o.charCodeAt(0) - 97) + 8 * (+o[1] - 1), b = (t.charCodeAt(0) - 97) + 8 * (+t[1] - 1);
  const dr = (b >> 3) - (a >> 3), df = (b & 7) - (a & 7), m = a + (Math.abs(dr) === 2 ? 8 * dr : df);
  return g.state.pieces.has(('abcdefgh'[m & 7] + ((m >> 3) + 1)) as Key);
}
