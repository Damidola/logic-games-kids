// Замінник lila «lib/game»: колір того, хто ходить, з FEN.
export const fenColor = (fen: string): Color => (fen.split(' ')[1] === 'b' ? 'black' : 'white');
