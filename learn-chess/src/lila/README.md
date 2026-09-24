Код уроків узято з Lichess: https://github.com/lichess-org/lila (ui/learn/src), ліцензія AGPL-3.0-or-later.
Весь модуль, окрім екранного читача (nvui). Змінено:
- `hashRouting.ts` — посилання від адреси сторінки, а не `/learn`;
- `view.ts` — без блоку «Що далі?» (посилання на сторінки lichess.org);
- `chessground.ts` — тап лише вибирає фігуру, перетягування з 5 px; дотики як у застосунку Lichess (`lgTouch`, як в усіх іграх сайту).
Службові модулі lila (`lib/*`) замінено простими аналогами в `../shims`, глобальний `site` (звуки) — у `../site.ts`, `snabbdom` — справжній з npm.
Стилі — `../../lila-learn.css`, зібрані sass-ом з `ui/learn/css`, `ui/lib/css/theme` (кольори й шрифти), `ui/lib/css/base` (типографіка, іконки), `ui/lib/css/component/_button`, `ui/bits/css/learn`.
Шрифти й звуки — `learn-chess/assets/font`, `learn-chess/assets/sound` (lila `public/font`, `public/sound`).
Тексти — переклад Lichess (translation/dest/learn/uk-UA.xml), зібрано в `../i18n.ts`.
Картинки `learn-chess/assets/images` — з lila/public/images.
