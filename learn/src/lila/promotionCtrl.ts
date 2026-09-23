// Змінено для logic-games-kids: пішак, що дійшов до кінця, одразу стає ферзем (без вікна вибору).
export class PromotionCtrl {
  constructor(readonly withGround: (f: (g: CgApi) => any) => any, readonly redraw: () => void) {}
  start = (orig: Key, dest: Key, sendMove: (o: Key, d: Key, p?: 'queen') => void): boolean => {
    return !!this.withGround(g => {
      const piece = g.state.pieces.get(dest);
      if (piece?.role === 'pawn' && (dest[1] === '8' || dest[1] === '1')) {
        g.setPieces(new Map([[dest, { color: piece.color, role: 'queen', promoted: true }]]));
        sendMove(orig, dest, 'queen');
        return true;
      }
      return false;
    });
  };
}
