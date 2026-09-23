// Замінник глобального «site» з lila для уроків: звуки Lichess (learn/assets/sound) через звук і гучність сайту,
// а також дотики до дошки як у застосунку Lichess (lgTouch, викликається з lila/chessground.ts).
import { lichessTouch } from '../../shared/board.js';

const LG = (window as any).LG;
// Звуки Lichess (learn/assets/sound, з lila public/sound) — через звук і гучність сайту
const sounds = new Map<string, HTMLAudioElement>();
const soundUrl = (p: string) => new URL('assets/sound/' + p, document.baseURI).href;
const sound = {
  url: soundUrl,
  load: (name: string, url: string) => { const a = new Audio(url); a.preload = 'auto'; sounds.set(name, a); },
  play: (name: string, volume = 1) => {
    if (LG.muted || LG.volume <= 0) return;
    if (!sounds.has(name)) sound.load(name, soundUrl(name === 'move' ? 'standard/Move.mp3' : name + '.mp3'));
    const a = sounds.get(name)!.cloneNode() as HTMLAudioElement;
    a.volume = Math.min(1, volume * LG.volume);
    a.play().catch(() => {});
  }
};
(globalThis as any).site = { blindMode: false, reload: () => location.reload(), sound };
(globalThis as any).lgTouch = lichessTouch;
