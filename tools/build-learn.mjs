// Збирає «Як ходять фігури» (код уроків Lichess + наш інтерфейс) в один файл learn/app.js.
// Запуск: npm install && npm run build   (готовий learn/app.js лежить у репозиторії)
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const shim = { lib: 'lib.ts', 'lib/game': 'lib-game.ts', 'lib/game/ground': 'lib.ts', snabbdom: 'snabbdom.ts' };

await build({
  entryPoints: [here('../learn/src/app.ts')],
  outfile: here('../learn/app.js'),
  bundle: true, format: 'esm', minify: true, target: 'es2020', legalComments: 'none',
  plugins: [{
    name: 'site-paths',
    setup(b) {
      // службові модулі lila → наші замінники
      b.onResolve({ filter: /^(lib|lib\/game|lib\/game\/ground|snabbdom)$/ }, a => ({ path: here('../learn/src/shims/' + shim[a.path]) }));
      // chessops і дошка беруться з уже зібраних файлів сайту
      b.onResolve({ filter: /^chessops(\/.*)?$/ }, () => ({ path: '../shared/vendor/chessops.js', external: true }));
      b.onResolve({ filter: /^@lichess-org\/chessground/ }, () => ({ path: '../shared/vendor/chessground.js', external: true }));
      b.onResolve({ filter: /shared\/board\.js$/ }, () => ({ path: '../shared/board.js', external: true }));
    }
  }]
});
console.log('learn/app.js зібрано');
