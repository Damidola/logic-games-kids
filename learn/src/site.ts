// Замінник глобального «site» з lila для уроків: звуки Lichess (learn/assets/sound) через звук і гучність сайту,
// а також дотики до дошки як у застосунку Lichess (lgTouch, викликається з lila/chessground.ts).
import { lichessTouch } from '../../shared/board.js';

const LG = (window as any).LG;
// Звуки Lichess (learn/assets/sound, з lila public/sound) — тим самим програвачем сайту (Web Audio, без затримки)
const soundUrl = (p: string) => new URL('assets/sound/' + p, document.baseURI).href;
const files = new Map<string, string>();
const sound = {
  url: soundUrl,
  load: (name: string, url: string) => { files.set(name, url); },
  play: (name: string, volume = 1) => {
    const url = files.get(name) || soundUrl(name === 'move' ? 'standard/Move.mp3' : name + '.mp3');
    LG.playFile(url, volume);
  }
};
(globalThis as any).site = { blindMode: false, reload: () => location.reload(), sound };
(globalThis as any).lgTouch = lichessTouch;
