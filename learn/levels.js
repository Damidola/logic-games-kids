/* Уроки «Як ходять фігури»: кожна фігура збирає зірочки ⭐ за якомога менше ходів.
   Клітинки — шахові назви: a1 внизу зліва. stones — камінці, крізь які не пройти,
   enemies — чорні фігури, які треба збити (вони не ходять). */
window.LEARN_CHAPTERS = [
  {
    id: 'rook', piece: 'R', name: 'Тура', hint: 'Тура ходить прямо: вгору, вниз, вліво, вправо — на скільки завгодно клітинок.',
    levels: [
      { from: 'a1', stars: ['a6'] },
      { from: 'd1', stars: ['d5', 'g5'] },
      { from: 'h8', stars: ['h2', 'b2', 'b7'] },
      { from: 'a1', stars: ['a4', 'e4', 'e8', 'h8'] },
      { from: 'e1', stars: ['e7', 'b7', 'b3', 'g3'], stones: ['e5'] },
      { from: 'a8', stars: ['h1'], stones: ['a4', 'e8', 'b1', 'h5', 'd4', 'e3'] }
    ]
  },
  {
    id: 'bishop', piece: 'B', name: 'Слон', hint: 'Слон ходить навскоси — лише по клітинках свого кольору.',
    levels: [
      { from: 'c1', stars: ['f4'] },
      { from: 'f1', stars: ['b5', 'd7'] },
      { from: 'c1', stars: ['a3', 'd6', 'h2'] },
      { from: 'e4', stars: ['b1', 'a2', 'h7', 'g8'] },
      { from: 'd4', stars: ['h8', 'a1', 'g1'], stones: ['f6'] }
    ]
  },
  {
    id: 'queen', piece: 'Q', name: 'Ферзь', hint: 'Ферзь ходить і як тура, і як слон — прямо й навскоси.',
    levels: [
      { from: 'd1', stars: ['d6', 'h2'] },
      { from: 'a1', stars: ['h8', 'h1', 'a8'] },
      { from: 'e4', stars: ['b7', 'b2', 'g2', 'g7', 'e8'] },
      { from: 'd4', stars: ['a4', 'd1', 'h5', 'f8', 'b6'], stones: ['c4', 'd5'] }
    ]
  },
  {
    id: 'king', piece: 'K', name: 'Король', hint: 'Король ходить лише на одну клітинку — у будь-який бік.',
    levels: [
      { from: 'e1', stars: ['e3'] },
      { from: 'e4', stars: ['f5', 'e6', 'd5'] },
      { from: 'a1', stars: ['c3', 'e3', 'g1'] },
      { from: 'd4', stars: ['c3', 'e3', 'e5', 'c5'] }
    ]
  },
  {
    id: 'knight', piece: 'N', name: 'Кінь', hint: 'Кінь ходить буквою «Г»: дві клітинки прямо і одну вбік. Він перестрибує через усе!',
    levels: [
      { from: 'b1', stars: ['c3'] },
      { from: 'g1', stars: ['f3', 'e5'] },
      { from: 'b1', stars: ['d2', 'f3', 'h4'] },
      { from: 'd4', stars: ['e6', 'c5', 'e2', 'b3'] },
      { from: 'b1', stars: ['c3', 'e4'], stones: ['b2', 'c2', 'd2', 'a3', 'b3', 'd3'] },
      { from: 'a1', stars: ['h8'] }
    ]
  },
  {
    id: 'pawn', piece: 'P', name: 'Пішак', hint: 'Пішак ходить лише вперед на одну клітинку (з першого ходу — можна на дві), а б’є навскоси. Дійшов до кінця — стає ферзем!',
    levels: [
      { from: 'e2', stars: ['e4'] },
      { from: 'd2', stars: ['d3', 'd5', 'd6'] },
      { from: 'c2', stars: [], enemies: { d3: 'P', c4: 'N' } },
      { from: 'e2', stars: ['e6'], enemies: { d3: 'P', e5: 'B' } },
      { from: 'b6', stars: ['b8'] },
      { from: 'g7', stars: ['g8', 'a2'] }
    ]
  },
  {
    id: 'capture', piece: 'Q', icon: 'bN', name: 'Бий фігури!', hint: 'Збий усі чорні фігури. Вони не ходять — просто стань на їхню клітинку.',
    levels: [
      { piece: 'R', from: 'a1', stars: [], enemies: { a6: 'P', f6: 'N' } },
      { piece: 'B', from: 'c1', stars: [], enemies: { e3: 'P', b6: 'R', f2: 'N' } },
      { piece: 'N', from: 'b1', stars: [], enemies: { c3: 'P', e4: 'B', g5: 'R' } },
      { piece: 'Q', from: 'd1', stars: [], enemies: { d7: 'R', a4: 'B', h5: 'N', g8: 'P' } },
      { piece: 'K', from: 'e1', stars: [], enemies: { e2: 'P', f3: 'N', g3: 'B' } },
      { piece: 'Q', from: 'a1', stars: ['h1'], enemies: { a8: 'R', d5: 'N', h8: 'B', e1: 'P' }, stones: ['c3', 'f6'] }
    ]
  }
];
