/* Дитячі доповнення до «Пішаків»: великий суперник з вибором,
   координати на дошці, рахунок збитих фігур, стрілка-підказка,
   налаштування кольорів дошки. Підключається останнім. */
(function () {
    'use strict';

    const hero = document.getElementById('opponent-hero');
    const heroPrev = document.getElementById('opponent-prev');
    const heroNext = document.getElementById('opponent-next');
    const picker = document.getElementById('opponent-picker');
    const pickerGrid = document.getElementById('picker-grid');
    const arrowSvg = document.getElementById('hint-arrow');
    const FILES = 'abcdefgh';
    let PIECES = '../shared/pieces/' + LG.pieceSet() + '/';
    function applyPieceSet() {
        PIECES = '../shared/pieces/' + LG.pieceSet() + '/';
        const abs = f => `url("${new URL(PIECES + f, location.href).href}")`;
        document.body.style.setProperty('--pw', abs('wP.svg'));
        document.body.style.setProperty('--pb', abs('bP.svg'));
        if (window.renderMaterial) renderMaterial();
    }

    // Рівні складності — у тому порядку, в якому вони вперше зустрічаються серед
    // тварин-суперників, незалежно від того, яку тварину зараз показано.
    // 5 рівнів складності в налаштуваннях
    const DIFF_TIERS = ['giveaway', 'weak', 'novice', 'medium', 'expert'];
    const TIER_OF = { giveaway: 0, very_easy: 0, weak: 1, completely_random: 1, novice: 2, easy: 2, medium: 3, advanced: 3, hard: 4, expert: 4 };

    // ---------- кольори дошки ----------
    // Перша — класична коричнева (дерево), вона й за замовчуванням.
    const PRESETS = [
        { name: 'Дерево', light: '#F0D9B5', dark: '#B58863' },
        { name: 'Чорно-біла', light: '#F5F5F5', dark: '#3B3B3B' },
        { name: 'Зелена', light: '#EEEED2', dark: '#769656' },
        { name: 'Синя', light: '#DEE3E6', dark: '#8CA2AD' },
        { name: 'Фіолетова', light: '#ECE6FA', dark: '#9C88D6' },
        { name: 'Рожева', light: '#FCE4EC', dark: '#E07A9C' }
    ];
    // Палітра дошки НЕ зберігається між заходами: щоразу при відкритті — класична коричнева.
    let boardColors = { light: PRESETS[0].light, dark: PRESETS[0].dark };

    function hexToRgb(hex) {
        hex = (hex || '#000000').replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16) || 0;
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function rgba(c, a) { return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; }
    // Чи схожий колір на зелений (щоб не загубити зелену мітку ходу на зеленій дошці)
    function isGreenish(hex) {
        const c = hexToRgb(hex);
        return c.g > c.r + 15 && c.g > c.b + 15;
    }

    // Мітка «куди можна піти» завжди зелена й добре видна на будь-якій дошці.
    // Виняток — сама дошка зелена: тоді мітка жовта, щоб не зливатися з фоном.
    function applyBoardColors() {
        document.body.style.setProperty('--sq-light', boardColors.light);
        document.body.style.setProperty('--sq-dark', boardColors.dark);
        const greenBoard = isGreenish(boardColors.dark) || isGreenish(boardColors.light);
        document.body.style.setProperty('--move-dot', greenBoard ? 'rgba(255, 193, 7, .88)' : 'rgba(46, 204, 64, .85)');
        document.body.style.setProperty('--move-capture-dot', 'rgba(230, 74, 25, .85)');
    }
    applyBoardColors();

    // ---------- показувати підказки ходів (кому вони заважають — можна вимкнути) ----------
    let showMoveHints = LG.store.get('pawns:showHints', true);
    function applyMoveHints() {
        document.body.classList.toggle('hide-move-hints', !showMoveHints);
    }
    applyMoveHints();

    function isFlipped() { return chessboardEl.classList.contains('flipped'); }

    // ---------- координати (цифри зліва, літери знизу) ----------
    function updateCoords() {
        const flipped = isFlipped();
        const leftCol = flipped ? 7 : 0;
        const bottomRow = flipped ? 0 : 7;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = getSquareElement(r, c);
                if (!sq) continue;
                let layer = sq.querySelector('.coord-layer');
                if (!layer) {
                    layer = document.createElement('span');
                    layer.className = 'coord-layer';
                    layer.innerHTML = '<i class="rank"></i><i class="file"></i>';
                    sq.appendChild(layer);
                }
                layer.firstChild.textContent = c === leftCol ? String(8 - r) : '';
                layer.lastChild.textContent = r === bottomRow ? FILES[c] : '';
            }
        }
    }

    // ---------- рахунок збитих фігур під і над дошкою ----------
    window.renderMaterial = function () {
        const top = document.getElementById('material-top');
        const bottom = document.getElementById('material-bottom');
        if (!top || !bottom) return;
        // capturedCounts[X] — скільки пішаків КОЛЬОРУ X було збито (це втрати X).
        const byAi = capturedCounts[playerColor] || 0;   // скільки моїх пішаків збив суперник
        const byMe = capturedCounts[aiColor] || 0;       // скільки пішаків суперника збив я
        // Скільки збито — стільки й «+N» (одна пішака +1, дві +2 …)
        const row = (count, pieceColor) => {
            if (!count) return '';
            let html = '';
            for (let i = 0; i < count; i++) html += `<img src="${PIECES}${pieceColor}P.svg" alt="">`;
            return html + `<b>+${count}</b>`;
        };
        top.innerHTML = row(byAi, playerColor);
        bottom.innerHTML = row(byMe, aiColor);
    };

    // ---------- стрілка-підказка ----------
    window.showHintArrow = function (h) {
        const flip = isFlipped();
        const pos = (r, c) => flip ? { x: 7 - c + 0.5, y: 7 - r + 0.5 } : { x: c + 0.5, y: r + 0.5 };
        const a = pos(h.from.row, h.from.col), b = pos(h.to.row, h.to.col);
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const ex = b.x - dx / len * 0.28, ey = b.y - dy / len * 0.28;
        arrowSvg.innerHTML = `
            <defs><marker id="ah" viewBox="0 0 10 10" refX="3.5" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#FF9F1C"/></marker></defs>
            <circle cx="${a.x}" cy="${a.y}" r="0.42" fill="none" stroke="#FF9F1C" stroke-width="0.09"/>
            <line x1="${a.x}" y1="${a.y}" x2="${ex}" y2="${ey}" stroke="#FF9F1C" stroke-width="0.2" stroke-linecap="round" marker-end="url(#ah)"/>`;
        arrowSvg.classList.add('show');
    };
    window.clearHintArrow = function () {
        arrowSvg.innerHTML = '';
        arrowSvg.classList.remove('show');
    };

    // ---------- фон за персонажем: космос для роботів, море для риб і т.д. ----------
    // Сусідні персонажі одного рівня мають одну сцену — фон міняється рідко
    const HERO_BG = { giveaway: 'summer', very_easy: 'summer', weak: 'rainbow', completely_random: 'rainbow',
        novice: 'jungle', easy: 'sea', medium: 'autumn', advanced: 'winter', hard: 'night', expert: 'space' };
    function heroBgFor(o) { return HERO_BG[o.difficulty] || 'summer'; }
    // Усі сцени завантажуємо одразу — тоді при зміні персонажа фон не блимає
    ['space', 'summer', 'winter', 'sea', 'jungle', 'desert', 'beach', 'night', 'rainbow', 'autumn']
        .forEach(n => { new Image().src = 'img/bg/' + n + '.svg'; });
    setTimeout(() => opponents.forEach(o => { new Image().src = o.avatar; }), 1500);

    // ---------- великий суперник і вибір ----------
    const heroWrap = document.querySelector('.opponent-wrap');
    const avatarEl = document.getElementById('ai-avatar');
    function positionHeroArrows() {
        const wrapRect = heroWrap.getBoundingClientRect();
        const avRect = avatarEl.getBoundingClientRect();
        if (!wrapRect.width || !avRect.width) return;
        const gap = 4;
        const l = Math.max(2, avRect.left - wrapRect.left - 34 - gap);
        const r = Math.max(2, wrapRect.right - avRect.right - 34 - gap);
        heroPrev.style.left = l + 'px';
        heroNext.style.right = r + 'px';
    }
    window.addEventListener('resize', positionHeroArrows);
    function paintHero() {
        const o = opponents[currentOpponentIndex];
        if (!o) return;
        hero.classList.toggle('pixel', !!o.pixel);
        heroWrap.dataset.bg = heroBgFor(o); // своя сцена-фон для кожного персонажа
        hero.setAttribute('aria-label', 'Суперник: ' + o.name + '. Натисни, щоб обрати іншого');
        requestAnimationFrame(positionHeroArrows);
    }
    const origLabel = window.updateOpponentLabel;
    window.updateOpponentLabel = function () { if (origLabel) origLabel(); paintHero(); };

    function openPicker() {
        pickerGrid.innerHTML = opponents.map((o, i) => `
            <button type="button" class="pick ${i === currentOpponentIndex ? 'current' : ''} ${o.pixel ? 'pixel' : ''}" data-i="${i}">
                <img src="${o.avatar}" alt="">
                <span class="pick-name">${o.name}</span>
            </button>`).join('');
        picker.hidden = false;
        requestAnimationFrame(() => picker.classList.add('open'));
        const cur = pickerGrid.querySelector('.current');
        if (cur) cur.scrollIntoView({ block: 'center' });
    }
    function closePicker() {
        picker.classList.remove('open');
        setTimeout(() => { picker.hidden = true; }, 200);
    }
    // Інша тварина — гра продовжується з тієї ж позиції, міняється лише суперник
    function selectOpponent(i) {
        if (i === currentOpponentIndex) return;
        currentOpponentIndex = i;
        LG.store.set('pawns:aiDifficultyOverride', null); // обрана тварина сама визначає складність
        const o = opponents[i];
        aiDifficulty = o.difficulty;
        // Плавна зміна: нова картинка спершу вантажиться, потім м'яко з'являється
        const img = new Image();
        img.onload = img.onerror = () => {
            if (currentOpponentIndex !== i) return;
            avatarEl.src = o.avatar; avatarEl.alt = o.name;
            updateOpponentLabel();
            heroWrap.classList.remove('switching');
        };
        heroWrap.classList.add('switching');
        img.src = o.avatar;
    }
    hero.addEventListener('click', openPicker);
    picker.addEventListener('click', e => {
        const b = e.target.closest('.pick');
        if (!b) { if (e.target === picker || e.target.closest('#picker-x')) closePicker(); return; }
        closePicker();
        selectOpponent(+b.dataset.i);
    });
    // Маленькі стрілочки: перемкнути тваринку вручну, без відкриття списку
    heroPrev.addEventListener('click', e => {
        e.stopPropagation();
        selectOpponent((currentOpponentIndex - 1 + opponents.length) % opponents.length);
    });
    heroNext.addEventListener('click', e => {
        e.stopPropagation();
        selectOpponent((currentOpponentIndex + 1) % opponents.length);
    });

    // Суперник «думає», поки ходить робот
    const origButtons = window.updateButtonStates;
    window.updateButtonStates = function () { origButtons(); hero.classList.toggle('thinking', !!aiThinking); };

    // Після кожного малювання дошки — координати
    const origRender = window.renderBoard;
    window.renderBoard = function () { origRender(); updateCoords(); };

    // ---------- налаштування: складність, підказки, ходи назад ----------
    LG.addSettings(() => {
        const wrap = document.createElement('div');
        const HINT_OPTIONS = ['0', '1', '2', '3', '5', '10'].map(v => ({ v, t: v }));
        const hintCap = String(LG.store.get('pawns:hints', '3'));
        const undoCap = String(LG.store.get('pawns:undos', '3'));
        wrap.innerHTML = `
            <div class="lg-set-title">Складність гри (тварину не міняє)</div>
            <div class="diff-dots" id="diff-dots">${DIFF_TIERS.map((d, i) =>
                `<button type="button" class="dot" data-i="${i}">${i + 1}</button>`).join('')}
            </div>
            <div class="lg-set-row"><span>Кількість підказок</span>
                <select id="hint-cap">${HINT_OPTIONS.map(o => `<option value="${o.v}" ${o.v === hintCap ? 'selected' : ''}>${o.t}</option>`).join('')}</select>
            </div>
            <div class="lg-set-row"><span>Ходів назад</span>
                <select id="undo-cap">${HINT_OPTIONS.map(o => `<option value="${o.v}" ${o.v === undoCap ? 'selected' : ''}>${o.t}</option>`).join('')}</select>
            </div>`;
        const dots = [...wrap.querySelectorAll('.diff-dots .dot')];
        // Підсвічується лише обраний рівень
        const paintDots = idx => dots.forEach((d, i) => d.classList.toggle('filled', i === idx));
        paintDots(TIER_OF[aiDifficulty] ?? 0);
        dots.forEach((d, i) => d.addEventListener('click', () => {
            aiDifficulty = DIFF_TIERS[i];
            LG.store.set('pawns:aiDifficultyOverride', aiDifficulty);
            paintDots(i);
        }));
        wrap.querySelector('#hint-cap').addEventListener('change', e => {
            LG.store.set('pawns:hints', e.target.value);
            hintsRemaining = Number(e.target.value); updateButtonStates();
        });
        wrap.querySelector('#undo-cap').addEventListener('change', e => {
            LG.store.set('pawns:undos', e.target.value);
            undosRemaining = Number(e.target.value); updateButtonStates();
        });
        return wrap;
    });
    // ---------- налаштування: дошка ----------
    LG.addSettings(() => {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div class="lg-set-title">Колір дошки</div>
            <div class="swatches">${PRESETS.map((p, i) => `
                <button type="button" class="swatch" data-i="${i}" title="${p.name}" aria-label="${p.name}"
                    style="background:linear-gradient(135deg, ${p.light} 50%, ${p.dark} 50%)"></button>`).join('')}
            </div>
            <div class="lg-set-row"><span>Світлі клітинки</span><input type="color" id="c-light" value="${boardColors.light}"></div>
            <div class="lg-set-row"><span>Темні клітинки</span><input type="color" id="c-dark" value="${boardColors.dark}"></div>
            <label class="lg-set-row"><span>Показувати, куди можна ходити</span><input type="checkbox" id="hints-toggle" ${showMoveHints ? 'checked' : ''}></label>
            <label class="lg-set-row"><span>Взяття на проході</span><input type="checkbox" id="ep-toggle" ${isEnPassantEnabled ? 'checked' : ''}></label>`;
        const light = wrap.querySelector('#c-light'), dark = wrap.querySelector('#c-dark');
        const mark = () => wrap.querySelectorAll('.swatch').forEach((s, i) =>
            s.classList.toggle('active', PRESETS[i].light.toLowerCase() === boardColors.light.toLowerCase() && PRESETS[i].dark.toLowerCase() === boardColors.dark.toLowerCase()));
        // Колір дошки діє лише до перезаходу на сторінку — нічого не зберігаємо.
        const save = () => { applyBoardColors(); mark(); };
        wrap.querySelectorAll('.swatch').forEach((s, i) => s.addEventListener('click', () => {
            boardColors = { light: PRESETS[i].light, dark: PRESETS[i].dark };
            light.value = boardColors.light; dark.value = boardColors.dark; save();
        }));
        light.addEventListener('input', () => { boardColors = { light: light.value, dark: boardColors.dark }; save(); });
        dark.addEventListener('input', () => { boardColors = { light: boardColors.light, dark: dark.value }; save(); });
        wrap.querySelector('#ep-toggle').addEventListener('change', e => {
            LG.store.set('pawns:ep', e.target.checked);
            if (isEnPassantEnabled !== e.target.checked) toggleEnPassant();
        });
        wrap.querySelector('#hints-toggle').addEventListener('change', e => {
            showMoveHints = e.target.checked;
            LG.store.set('pawns:showHints', showMoveHints);
            applyMoveHints();
        });
        mark();
        return wrap;
    });

    // Сторінку не можна гортати пальцем (крім списку суперників і вікон)
    document.addEventListener('touchmove', e => {
        if (!e.target.closest('.lg-modal, .picker-card')) e.preventDefault();
    }, { passive: false });

    LG.addSettings(() => LG.pieceSetPicker(applyPieceSet));

    document.addEventListener('DOMContentLoaded', () => {
        applyPieceSet();
        paintHero();
        updateCoords();
        renderMaterial();
    });
})();
