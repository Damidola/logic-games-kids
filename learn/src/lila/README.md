Код уроків узято з Lichess: https://github.com/lichess-org/lila (ui/learn/src), ліцензія AGPL-3.0-or-later.
Весь модуль, окрім екранного читача (nvui). Змінено:
- `sound.ts` — звуки сайту;
- `hashRouting.ts` — посилання від адреси сторінки, а не `/learn`;
- `view.ts` — без блоку «Що далі?» (посилання на сторінки lichess.org);
- `chessground.ts` — тап лише вибирає фігуру, перетягування з 5 px (як в усіх іграх сайту).
Службові модулі lila (`lib/*`) замінено простими аналогами в `../shims`, `snabbdom` — справжній з npm.
Стилі — `../../lila-learn.css`, зібрані sass-ом з `ui/learn/css`, `ui/lib/css/theme`, `ui/bits/css/learn`.
Тексти — переклад Lichess (translation/dest/learn/uk-UA.xml), зібрано в `../i18n.ts`.
Картинки `learn/assets/images` — з lila/public/images.
