// Замінники дрібних модулів lila: licon, i18n, algo, storage, xhr, pubsub, prefs, device, userLink.
// Символи шрифту іконок Lichess (learn-chess/assets/font/lichess.woff2), як у lila ui/lib/src/licon.ts
export const licon = { Star: '\ue052', GreaterThan: '\ue026', LessThan: '\ue027' };

export const numberSpread = (el: HTMLElement, nbSteps: number, duration: number, previous: number) => (n: number) => {
  let i = 0;
  const step = () => { i++; el.textContent = String(Math.round(previous + ((n - previous) * i) / nbSteps)); if (i < nbSteps) setTimeout(step, duration / nbSteps); };
  step();
};

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const safe = <T>(f: () => T, d: T) => { try { return f(); } catch { return d; } };
export const storage = {
  get: (k: string) => safe(() => localStorage.getItem(k), null),
  set: (k: string, v: string) => safe(() => localStorage.setItem(k, v), undefined),
  remove: (k: string) => safe(() => localStorage.removeItem(k), undefined),
};

export const jsonAnyResponse = async () => ({});
export const form = (d: any) => d;

export const pubsub = { on: () => {} };

export enum Coords { Hidden = 0, Inside = 1, Outside = 2, All = 3 }

export const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const profileUrl = (u: string) => 'https://lichess.org/@/' + u;
