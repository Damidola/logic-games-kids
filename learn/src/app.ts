/* «Як ходять фігури» — Lichess Learn (lila/ui/learn) повністю: і рівні, і екрани.
   Тут лише під'єднання до сайту: дошка й фігури з налаштувань, тема, прогрес, автоповтор. */
import './i18n';
import './site'; // до коду Lichess: його sound.ts одразу звертається до site.sound
import { applyBoardLook } from '../../shared/board.js';
import { initModule } from './lila/learn';
import { Coords } from './shims/lib-misc';

(globalThis as any).$html = (s: TemplateStringsArray, ...v: unknown[]) => s.reduce((a, x, i) => a + x + (i < v.length ? v[i] : ''), '');
const LG = (window as any).LG;


// Прогрес зі старої версії сторінки (lg:learn:lichess) → формат Lichess (learn.progress)
try {
  const old = LG.store.get('learn:lichess', null) as Record<string, number[]> | null;
  if (old && !localStorage.getItem('learn.progress')) {
    const stages: Record<string, { scores: number[] }> = {};
    for (const [key, scores] of Object.entries(old)) stages[key] = { scores: Array.from(scores, s => s || 0) };
    localStorage.setItem('learn.progress', JSON.stringify({ stages }));
  }
} catch { /* без прогресу */ }

// Світла/нічна тема сайту → класи тем Lichess
const syncTheme = () => document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('lg-night'));
syncTheme();
new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

document.body.classList.add('is2d'); // як у Lichess: 2D-дошка
applyBoardLook();
LG.addSettings(() => LG.pieceSetPicker(() => location.reload()));

initModule({ pref: { coords: Coords.Inside, destination: true, is3d: false } });

// Помилка: після показу, що сталося, рівень починається заново сам (кнопка Lichess «Ще раз» теж працює)
let retryTimer = 0;
new MutationObserver(() => {
  const failed = document.querySelector<HTMLElement>('.learn__table .result.failed');
  if (failed && !retryTimer) retryTimer = window.setTimeout(() => { retryTimer = 0; document.querySelector<HTMLElement>('.learn__table .result.failed')?.click(); }, 1500);
  if (!failed && retryTimer) { clearTimeout(retryTimer); retryTimer = 0; }
}).observe(document.getElementById('learn-app')!, { childList: true, subtree: true });
