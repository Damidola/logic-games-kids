import { Chessground as makeChessground } from '@lichess-org/chessground';
import { h, type VNode } from 'snabbdom';

import { isSafari } from 'lib/device';
import { Coords } from 'lib/prefs';
import { onInsert } from 'lib/view';

import type { RunCtrl } from './run/runCtrl';

export interface Shape {
  orig: Key;
  dest?: Key;
  brush?: string;
}

export type CgMove = {
  orig: Key;
  dest: Key;
};

export default function (ctrl: RunCtrl): VNode {
  return h('div.cg-wrap', {
    hook: {
      ...onInsert(el => {
        el.addEventListener('contextmenu', e => e.preventDefault());
        const ground = makeChessground(el, makeConfig(ctrl));
        (globalThis as any).lgTouch?.(ground); // logic-games-kids: дотики як у застосунку Lichess (shared/board.js)
        ctrl.setChessground(ground);
      }),
      destroy: () => ctrl.chessground?.destroy(),
    },
  });
}

const makeConfig = (ctrl: RunCtrl): CgConfig => ({
  fen: '8/8/8/8/8/8/8/8',
  blockTouchScroll: true,
  coordinates: true,
  coordinatesOnSquares: ctrl.pref.coords === Coords.All,
  jsHover: isSafari(),
  movable: { free: false, color: undefined, showDests: ctrl.pref.destination },
  drawable: { enabled: false },
  draggable: { enabled: true, distance: 5, autoDistance: false },
  selectable: { enabled: true },
  addPieceZIndex: ctrl.pref.is3d,
});
