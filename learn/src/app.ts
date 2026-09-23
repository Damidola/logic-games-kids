/* «Як ходять фігури» — уроки Lichess Learn (lila/ui/learn) на спільній дошці сайту.
   Логіка рівнів, сценарії, перевірки й очки — оригінальний код Lichess (src/lila);
   тут лише наш інтерфейс: список розділів, екран уроку, прогрес. */
import './i18n';
import { createBoard } from '../../shared/board.js';
import { LevelCtrl } from './lila/levelCtrl';
import { categs, type Stage } from './lila/stage/list';
import { getLevelRank, getStageRank } from './lila/score';
import { withLinebreaks } from './lila/util';
import { clearTimeouts } from './lila/timeouts';

(globalThis as any).$html = (s: TemplateStringsArray, ...v: unknown[]) => s.reduce((a, x, i) => a + x + (i < v.length ? v[i] : ''), '');

const LG = (window as any).LG;
const $ = (id: string) => document.getElementById(id)!;
const img = (url: string) => url; // картинки лежать там, де їх шукає Lichess: assets/images/learn

// ---------- прогрес: очки за кожен рівень ----------
type Progress = Record<string, number[]>;
const progress: Progress = LG.store.get('learn:lichess', {});
const scores = (s: Stage) => progress[s.key] || [];
const saveScore = (s: Stage, levelId: number, score: number) => {
  const arr = progress[s.key] || (progress[s.key] = []);
  arr[levelId - 1] = Math.max(arr[levelId - 1] || 0, score);
  LG.store.set('learn:lichess', progress);
};
const stars = (rank: number) => '★'.repeat(4 - rank) + '☆'.repeat(rank - 1);

// ---------- список розділів ----------
function showMap() {
  clearTimeouts();
  $('lesson').hidden = true;
  const map = $('map');
  map.hidden = false;
  map.innerHTML = '';
  for (const c of categs) {
    const h = document.createElement('h2'); h.textContent = c.name; map.append(h);
    const grid = document.createElement('div'); grid.className = 'stages';
    for (const s of c.stages) {
      const sc = scores(s), done = sc.filter(Boolean).length === s.levels.length;
      const b = document.createElement('button');
      b.className = 'stage' + (done ? ' done' : '');
      b.innerHTML = `<img src="${img(s.image)}" alt=""><b></b><small></small><i>${sc.length ? stars(getStageRank(s, sc.filter(Boolean))) : ''}</i>`;
      b.querySelector('b')!.textContent = s.title;
      b.querySelector('small')!.textContent = s.subtitle;
      b.onclick = () => openStage(s);
      grid.append(b);
    }
    map.append(grid);
  }
}

// ---------- урок ----------
const board = createBoard($('board'), {});
let stage: Stage, level: LevelCtrl, levelIdx = 0;

function openStage(s: Stage, idx?: number) {
  stage = s;
  const sc = scores(s);
  levelIdx = idx ?? Math.max(0, s.levels.findIndex((_, i) => !sc[i]));
  $('map').hidden = true;
  $('lesson').hidden = false;
  board.redraw();
  if (idx === undefined && !sc.some(Boolean)) showIntro(); else startLevel();
}

function showIntro() {
  const o = $('overlay');
  o.hidden = false;
  o.innerHTML = '';
  const card = document.createElement('div'); card.className = 'card';
  const pic = document.createElement('img'); pic.src = img(stage.image);
  const t = document.createElement('h3'); t.textContent = stage.title;
  const p = document.createElement('p'); p.append(...withLinebreaks(stage.intro));
  const go = document.createElement('button'); go.className = 'lg-btn lg-btn-primary'; go.textContent = i18n.learn.letsGo;
  go.onclick = () => { o.hidden = true; startLevel(); };
  card.append(pic, t, p, go); o.append(card);
  startLevel(false);
}

function startLevel(run = true) {
  clearTimeouts();
  $('overlay').hidden = run ? true : $('overlay').hidden;
  const bp = stage.levels[levelIdx];
  level = new LevelCtrl(f => f(board.cg), bp, {
    onCompleteImmediate: () => saveScore(stage, bp.id, level.vm.score),
    onComplete: () => {
      if (levelIdx + 1 < stage.levels.length) { levelIdx++; startLevel(); }
      else stageDone();
    }
  }, redraw);
  redraw();
  if (run) level.start();
}

function stageDone() {
  const sc = scores(stage).filter(Boolean);
  LG.win(stage.complete + '\n' + i18n.site.yourScore.replace(/%s|\{0\}/, '') + ' ' + sc.reduce((a, b) => a + b, 0), { reward: true, onAgain: showMap });
  showMap();
}

function redraw() {
  const bp = stage.levels[levelIdx];
  $('stage-title').textContent = stage.title;
  const goal = $('goal'); goal.innerHTML = ''; goal.append(...withLinebreaks(bp.goal));
  const sc = scores(stage);
  $('dots').innerHTML = stage.levels.map((l, i) =>
    `<button data-i="${i}" class="${sc[i] ? 'r' + getLevelRank(l, sc[i]) : ''} ${i === levelIdx ? 'cur' : ''}">${i + 1}</button>`).join('');
  $('score').textContent = String(level.vm.score);
  $('failed').hidden = !level.vm.failed;
  $('done').hidden = !level.vm.completed;
  if (level.vm.completed) $('done-stars').textContent = stars(getLevelRank(bp, level.vm.score));
}

$('dots').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button'); if (b) { levelIdx = +b.dataset.i!; startLevel(); }
});
$('to-map').onclick = showMap;
$('retry').onclick = () => startLevel();
$('failed').onclick = () => startLevel();
$('next').onclick = () => { if (levelIdx + 1 < stage.levels.length) { levelIdx++; startLevel(); } else showMap(); };

LG.addSettings(() => LG.pieceSetPicker(() => location.reload()));
document.addEventListener('touchmove', e => {
  if (!(e.target as HTMLElement).closest('.lg-modal, #map, .card')) e.preventDefault();
}, { passive: false });

showMap();
