/* Спільний набір для всіх ігор: верхня панель, правила, звуки, конфеті,
   зірочки та лічильник часу гри для батьків.
   Підключення в грі:
     <link rel="stylesheet" href="../shared/kit.css">
     <script src="../shared/games.js"></script>
     <script src="../shared/kit.js" data-game="checkers"></script>
   Ігри повідомляють результат так: LG.win(), LG.lose(), LG.draw(). */
(function () {
  'use strict';

  const script = document.currentScript;
  const gameId = script && script.dataset.game;
  const root = (script && script.getAttribute('src') || '').replace(/shared\/kit\.js.*$/, '');
  const game = (window.LG_GAMES || []).find(g => g.id === gameId) || null;

  // ---------- сховище (може бути недоступне в приватному режимі) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('lg:' + key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('lg:' + key, JSON.stringify(value)); } catch (e) { /* ігноруємо */ }
    }
  };

  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- звуки (синтезовані, без файлів) ----------
  let audioCtx = null;
  function tone(freq, start, dur, type, vol) {
    const t = audioCtx.currentTime + start;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  const SOUNDS = {
    tap: () => tone(660, 0, 0.08, 'triangle', 0.12),
    place: () => { tone(520, 0, 0.09, 'triangle', 0.14); tone(780, 0.05, 0.1, 'triangle', 0.1); },
    error: () => { tone(220, 0, 0.14, 'sawtooth', 0.06); tone(180, 0.1, 0.18, 'sawtooth', 0.05); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.16)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.3, 'sine', 0.12)),
    draw: () => [440, 440].forEach((f, i) => tone(f, i * 0.18, 0.2, 'sine', 0.12))
  };
  function play(name) {
    if (LG.muted || !SOUNDS[name]) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      SOUNDS[name]();
    } catch (e) { /* без звуку */ }
  }

  // ---------- статистика ----------
  function stats() { return store.get('stats', {}); }
  function record(result) {
    if (!gameId) return;
    const all = stats();
    const s = all[gameId] || { played: 0, wins: 0, draws: 0 };
    s.played += 1;
    if (result === 'win') s.wins += 1;
    if (result === 'draw') s.draws += 1;
    s.last = today();
    all[gameId] = s;
    store.set('stats', all);
    const log = store.get('log', {});
    const d = log[today()] || { wins: 0, games: 0, seconds: 0 };
    d.games += 1;
    if (result === 'win') d.wins += 1;
    log[today()] = d;
    store.set('log', log);
  }

  // Час гри: рахуємо лише коли вкладка видима
  let tickStart = null;
  function flushTime() {
    if (tickStart === null) return;
    const secs = Math.round((Date.now() - tickStart) / 1000);
    tickStart = document.hidden ? null : Date.now();
    if (secs <= 0 || secs > 3600) return;
    const log = store.get('log', {});
    const d = log[today()] || { wins: 0, games: 0, seconds: 0 };
    d.seconds += secs;
    log[today()] = d;
    store.set('log', log);
    checkBreak(d.seconds);
  }
  function checkBreak(seconds) {
    const limit = store.get('breakMinutes', 0);
    if (!limit) return;
    const shownFor = store.get('breakShown', '');
    const mark = today() + ':' + Math.floor(seconds / 60 / limit);
    if (seconds >= limit * 60 && shownFor !== mark) {
      store.set('breakShown', mark);
      showBreak(limit);
    }
  }

  // ---------- DOM helpers ----------
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(c => c && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }

  // ---------- модальне вікно ----------
  let modal = null;
  function openModal(content, opts) {
    closeModal();
    const card = el('div', { class: 'lg-modal-card' + (opts && opts.cls ? ' ' + opts.cls : ''), role: 'dialog', 'aria-modal': 'true' });
    const close = el('button', { class: 'lg-modal-x', 'aria-label': 'Закрити', text: '✕', onclick: closeModal });
    card.appendChild(close);
    card.appendChild(content);
    modal = el('div', { class: 'lg-modal', onclick: e => { if (e.target === modal) closeModal(); } }, [card]);
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal && modal.classList.add('lg-open'));
    const focusable = card.querySelector('.lg-btn') || close;
    focusable.focus({ preventScroll: true });
  }
  function closeModal() {
    if (!modal) return;
    const m = modal;
    modal = null;
    m.classList.remove('lg-open');
    setTimeout(() => m.remove(), 200);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function showRules() {
    if (!game) return;
    const r = game.rules;
    const body = el('div', { class: 'lg-rules' }, [
      el('div', { class: 'lg-rules-head' }, [
        el('span', { class: 'lg-rules-emoji', text: game.emoji }),
        el('h2', { text: game.title })
      ]),
      el('div', { class: 'lg-rules-goal' }, [el('b', { text: '🎯 Мета: ' }), r.goal]),
      el('h3', { text: '🕹️ Як грати' }),
      el('ul', {}, r.how.map(t => el('li', { text: t }))),
      el('h3', { text: '💡 Порада' }),
      el('ul', { class: 'lg-tips' }, r.tips.map(t => el('li', { text: t }))),
      el('details', { class: 'lg-parents' }, [
        el('summary', { text: '👨‍👩‍👧 Для батьків' }),
        el('p', { text: game.parents }),
        el('p', { class: 'lg-skill-row' }, [
          el('span', { text: 'Вік: ' + game.age + '+' }),
          ...game.skills.map(s => el('span', { class: 'lg-chip', text: s }))
        ])
      ]),
      el('button', { class: 'lg-btn lg-btn-primary lg-btn-wide', text: 'Зрозуміло, граємо! 🚀', onclick: closeModal })
    ]);
    openModal(body, { cls: 'lg-modal-rules' });
  }

  function showBreak(limit) {
    openModal(el('div', { class: 'lg-result' }, [
      el('div', { class: 'lg-result-emoji', text: '🧘' }),
      el('h2', { text: 'Час на перерву!' }),
      el('p', { text: 'Ти граєш уже ' + limit + ' хв. Потягнись, подивись у вікно і попий водички 💧' }),
      el('button', { class: 'lg-btn lg-btn-primary', text: 'Добре!', onclick: closeModal })
    ]));
  }

  // ---------- тости ----------
  let toastBox = null;
  function toast(msg, kind) {
    if (!toastBox) { toastBox = el('div', { class: 'lg-toasts', 'aria-live': 'polite' }); document.body.appendChild(toastBox); }
    const t = el('div', { class: 'lg-toast' + (kind ? ' lg-toast-' + kind : ''), text: String(msg) });
    toastBox.appendChild(t);
    requestAnimationFrame(() => t.classList.add('lg-show'));
    setTimeout(() => { t.classList.remove('lg-show'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  // ---------- конфеті ----------
  function confetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = el('canvas', { class: 'lg-confetti' });
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#FF6B6B', '#FFB300', '#2ECC9A', '#4DA3FF', '#A66CFF', '#FF9F43'];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: colors[(Math.random() * colors.length) | 0]
    }));
    const start = performance.now();
    (function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(p => {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1 - t / 3000);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t < 3000) requestAnimationFrame(frame); else c.remove();
    })(start);
  }

  // ---------- результати ----------
  const PRAISE = ['Молодець!', 'Чудово!', 'Супер!', 'Ти справжній мислитель!', 'Неймовірно!', 'Так тримати!'];
  const CHEER = ['Нічого страшного!', 'Майже вийшло!', 'Наступного разу вийде!', 'Спробуй ще раз!'];
  const pick = a => a[(Math.random() * a.length) | 0];
  let lastResultAt = 0;

  function result(kind, message, opts) {
    // деякі ігри викликають перевірку кінця гри кілька разів поспіль
    if (Date.now() - lastResultAt < 1500) return;
    lastResultAt = Date.now();
    record(kind);
    play(kind);
    if (kind === 'win') confetti();
    if (opts && opts.silent) return;
    // Малюк ще не читає: велика картинка, одне слово і дві кнопки-іконки
    const cfg = {
      win: { emoji: pick(['🏆', '🌟', '🥳', '🎉']), title: 'Перемога!' },
      lose: { emoji: pick(['🙈', '🐢', '💪']), title: 'Ой!' },
      draw: { emoji: '🤝', title: 'Нічия!' }
    }[kind];
    const s = stats()[gameId] || { wins: 0 };
    const children = [
      el('div', { class: 'lg-result-emoji', text: cfg.emoji, title: message || '' }),
      el('h2', { text: cfg.title })
    ];
    const imgSlot = el('div', { class: 'lg-result-img' });
    if (opts && opts.image) children.push(imgSlot);
    if (kind === 'win' && s.wins) children.push(el('p', { class: 'lg-result-stars', text: '⭐ ' + s.wins }));
    const buttons = el('div', { class: 'lg-result-btns' });
    const again = opts && opts.onAgain;
    buttons.appendChild(el('button', {
      class: 'lg-btn lg-btn-primary lg-btn-big', 'aria-label': 'Ще раз', title: 'Ще раз', text: '🔄',
      onclick: () => { closeModal(); if (again) again(); }
    }));
    buttons.appendChild(el('a', { class: 'lg-btn lg-btn-big', href: root + 'index.html', 'aria-label': 'Усі ігри', title: 'Усі ігри', text: '🏠' }));
    children.push(buttons);
    setTimeout(() => openModal(el('div', { class: 'lg-result lg-result-' + kind }, children)), Math.max((opts && opts.delay) || 0, 1800));
    // Картинка-нагорода (наприклад, котик) з'являється, коли завантажиться
    if (opts && opts.image) {
      Promise.resolve(opts.image).then(url => {
        if (!url) return imgSlot.remove();
        const img = el('img', { alt: 'Нагорода за перемогу' });
        img.onload = () => imgSlot.appendChild(img);
        img.onerror = () => imgSlot.remove();
        img.src = url;
      }).catch(() => imgSlot.remove());
    }
  }

  // ---------- верхня панель ----------
  function buildBar() {
    const muteBtn = el('button', {
      class: 'lg-icon-btn', type: 'button',
      onclick: () => { LG.muted = !LG.muted; store.set('muted', LG.muted); paintMute(); if (!LG.muted) play('tap'); }
    });
    function paintMute() {
      muteBtn.textContent = LG.muted ? '🔇' : '🔊';
      muteBtn.title = LG.muted ? 'Увімкнути звук' : 'Вимкнути звук';
      muteBtn.setAttribute('aria-label', muteBtn.title);
      document.dispatchEvent(new CustomEvent('lg:mute', { detail: LG.muted }));
    }
    paintMute();

    const bar = el('header', { class: 'lg-bar' }, [
      el('a', { class: 'lg-icon-btn lg-home', href: root + 'index.html', title: 'До всіх ігор', 'aria-label': 'До всіх ігор' }, [
        el('span', { text: '🏠' })
      ]),
      el('div', { class: 'lg-bar-title' }, [
        el('span', { class: 'lg-bar-emoji', text: game.emoji }),
        el('span', { text: game.title })
      ]),
      el('div', { class: 'lg-bar-actions' }, [
        muteBtn,
        el('button', { class: 'lg-icon-btn lg-help', type: 'button', title: 'Правила', 'aria-label': 'Правила', text: '❓', onclick: showRules })
      ])
    ]);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ---------- публічне API ----------
  const LG = window.LG = {
    game,
    muted: store.get('muted', false),
    store,
    play,
    toast,
    confetti,
    showRules,
    openModal,
    closeModal,
    stats,
    win: (msg, opts) => result('win', msg, opts),
    lose: (msg, opts) => result('lose', msg, opts),
    draw: (msg, opts) => result('draw', msg, opts)
  };

  if (!game) return; // головна сторінка використовує лише API

  // Дитячі ігри не повинні показувати системні alert-вікна
  window.alert = msg => { toast(msg, 'warn'); play('error'); };

  function init() {
    document.documentElement.classList.add('lg');
    document.body.classList.add('lg-game', 'lg-game-' + gameId);
    document.title = game.title + ' · Логічні ігри';
    buildBar();
    tickStart = Date.now();
    setInterval(flushTime, 15000);
    document.addEventListener('visibilitychange', () => { flushTime(); if (!document.hidden) tickStart = Date.now(); });
    window.addEventListener('pagehide', flushTime);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
