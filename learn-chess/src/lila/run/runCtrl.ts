import { type Prop, prop } from 'lib';
import type { WithGround } from 'lib/game/ground';
import { pubsub } from 'lib/pubsub';

import { hashNavigate } from '../hashRouting';
import type { LearnProgress, LearnOpts } from '../learn';
import { LevelCtrl } from '../levelCtrl';
import { stageStart, stageEnd } from '../sound';
import { type Stage, type Level, byId as stageById } from '../stage/list';
import { clearTimeouts } from '../timeouts';
import { DEMOS, playDemo } from '../demo';

export class RunCtrl {
  data: LearnProgress = this.opts.storage.data;
  chessground?: CgApi;
  levelCtrl: LevelCtrl;

  stageStarting: Prop<boolean> = prop(false);
  stageCompleted: Prop<boolean> = prop(false);
  // logic-games-kids: приклад на початку етапу (demo.ts)
  demo: Prop<boolean> = prop(false);
  demoText: Prop<string> = prop('');
  demoDone: Prop<boolean> = prop(false);
  demoToken = 0;

  get stage(): Stage {
    return stageById[this.opts.stageId ?? 1];
  }

  constructor(
    readonly opts: LearnOpts,
    readonly redraw: () => void,
  ) {
    clearTimeouts();

    this.initializeLevel();

    // Helpful for debugging:
    // site.mousetrap.bind(['shift+enter'], this.levelCtrl.complete);
    pubsub.on('board.change', (is3d: boolean) => {
      this.withGround(g => {
        g.state.addPieceZIndex = is3d;
        g.redrawAll();
      });
    });
  }

  initializeLevel = (restarting = false) => {
    this.levelCtrl = new LevelCtrl(
      this.withGround,
      this.stage.levels[Number(this.opts.levelId) - 1],
      {
        onCompleteImmediate: () => {
          this.opts.storage.saveScore(this.stage, this.levelCtrl.blueprint, this.levelCtrl.vm.score);
        },
        onComplete: () => {
          if (this.levelCtrl.blueprint.id < this.stage.levels.length) {
            hashNavigate(this.stage.id, this.levelCtrl.blueprint.id + 1);
          } else if (this.stageCompleted()) return;
          else {
            this.stageCompleted(true);
            stageEnd();
          }
          this.redraw();
        },
      },
      this.redraw,
    );

    // без вікна «Етап N: … Поїхали!» — одразу дошка з першим завданням
    this.stageStarting(false && this.levelCtrl.blueprint.id === 1 && this.stageScore() === 0 && !restarting);
    this.stageCompleted(false);

    if (!this.opts.stageId) return;
    this.demo(false);
    this.demoToken++;
    if (!restarting && this.levelCtrl.blueprint.id === 1 && this.hasDemo()) return this.startDemo();
    if (this.stageStarting()) stageStart();
    else this.levelCtrl.start();
  };

  setChessground = (chessground: CgApi) => {
    this.chessground = chessground;
    this.withGround(this.levelCtrl.initializeWithGround);
    if (this.demo()) this.runDemo();
  };

  hasDemo = () => !!DEMOS[this.stage.key];

  // Показати приклад (заново); дошка — лише для перегляду
  startDemo = () => {
    this.demo(true);
    this.demoDone(false);
    this.demoText('');
    this.runDemo();
  };

  runDemo = () => {
    const t = ++this.demoToken;
    this.withGround(g =>
      playDemo(
        g,
        DEMOS[this.stage.key],
        text => {
          this.demoText(text);
          this.redraw();
        },
        () => t === this.demoToken && this.demo(),
        () => {
          this.demoDone(true);
          this.redraw();
        },
      ),
    );
  };

  replayDemo = () => {
    clearTimeouts();
    this.startDemo();
    this.redraw();
  };

  // «Почати»: рівень з початку
  endDemo = () => {
    this.initializeLevel(true);
    this.redraw();
  };

  pref = this.opts.pref;

  withGround: WithGround = f => (this.chessground ? f(this.chessground) : undefined);

  stageScore = () => this.data.stages[this.stage.key]?.scores.reduce((a, b) => a + b) ?? 0;

  score = (level: Level) => this.data.stages[this.stage.key]?.scores[level.id - 1] ?? 0;

  getNext = () => stageById[this.stage.id + 1];

  hideStartingPane = () => {
    if (!this.stageStarting()) return;
    this.stageStarting(false);
    this.levelCtrl.start();
    this.redraw();
  };

  restart = () => {
    this.initializeLevel(true);
    this.redraw();
  };
}
