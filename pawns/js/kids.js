/* Дитячі доповнення до «Пішаків»: великий суперник з вибором,
   координати на дошці, рахунок збитих фігур, стрілка-підказка,
   налаштування кольорів дошки. Підключається останнім. */
(function () {
    'use strict';

    const hero = document.getElementById('opponent-hero');
    const picker = document.getElementById('opponent-picker');
    const pickerGrid = document.getElementById('picker-grid');
    const arrowSvg = document.getElementById('hint-arrow');
    const FILES = 'abcdefgh';
    const PIECES = '../shared/pieces/';

    // ---------- кольори дошки ----------
    const PRESETS = [
        { name: 'Зелена', light: '#EEEED2', dark: '#769656' },
        { name: 'Дерево', light: '#F0D9B5', dark: '#B58863' },
        { name: 'Синя', light: '#DEE3E6', dark: '#8CA2AD' },
        { name: 'Фіолетова', light: '#ECE6FA', dark: '#9C88D6' },
        { name: 'Рожева', light: '#FCE4EC', dark: '#E07A9C' },
        { name: 'Сіра', light: '#E6E6E6', dark: '#8A8A8A' }
    ];
    let boardColors = LG.store.get('pawns:board', PRESETS[0]);
    function applyBoardColors() {
        document.body.style.setProperty('--sq-light', boardColors.light);
        document.body.style.setProperty('--sq-dark', boardColors.dark);
    }
    applyBoardColors();

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
        const byAi = capturedCounts[aiColor] || 0;       // скільки моїх пішаків збив суперник
        const byMe = capturedCounts[playerColor] || 0;   // скільки пішаків суперника збив я
        const row = (count, pieceColor, diff) => {
            let html = '';
            for (let i = 0; i < count; i++) html += `<img src="${PIECES}${pieceColor}P.svg" alt="">`;
            if (diff > 0) html += `<b>+${diff}</b>`;
            return html;
        };
        top.innerHTML = row(byAi, playerColor, byAi - byMe);
        bottom.innerHTML = row(byMe, aiColor, byMe - byAi);
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

    // ---------- великий суперник і вибір ----------
    function paintHero() {
        const o = opponents[currentOpponentIndex];
        if (!o) return;
        hero.classList.toggle('pixel', !!o.pixel);
        hero.setAttribute('aria-label', 'Суперник: ' + o.name + '. Натисни, щоб обрати іншого');
    }
    const origLabel = window.updateOpponentLabel;
    window.updateOpponentLabel = function () { if (origLabel) origLabel(); paintHero(); };

    function openPicker() {
        pickerGrid.innerHTML = opponents.map((o, i) => `
            <button type="button" class="pick ${i === currentOpponentIndex ? 'current' : ''} ${o.pixel ? 'pixel' : ''}" data-i="${i}">
                <img src="${o.avatar}" alt="">
                <span class="pick-name">${o.name}</span>
                <span class="pick-level">${'★'.repeat(Math.ceil((i + 1) / opponents.length * 5))}</span>
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
    hero.addEventListener('click', openPicker);
    picker.addEventListener('click', e => {
        const b = e.target.closest('.pick');
        if (!b) { if (e.target === picker) closePicker(); return; }
        const i = +b.dataset.i;
        closePicker();
        if (i === currentOpponentIndex) return;
        currentOpponentIndex = i;
        LG.store.set('pawns:opp', i);
        cleanupInteractionState(true);
        playerColor = 'w';
        initGame(false, 'pvai');
    });

    // Суперник «думає», поки ходить робот
    const origButtons = window.updateButtonStates;
    window.updateButtonStates = function () { origButtons(); hero.classList.toggle('thinking', !!aiThinking); };

    // Після кожного малювання дошки — координати
    const origRender = window.renderBoard;
    window.renderBoard = function () { origRender(); updateCoords(); };

    // ---------- налаштування гри ----------
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
            <label class="lg-set-row"><span>Взяття на проході</span><input type="checkbox" id="ep-toggle" ${isEnPassantEnabled ? 'checked' : ''}></label>`;
        const light = wrap.querySelector('#c-light'), dark = wrap.querySelector('#c-dark');
        const mark = () => wrap.querySelectorAll('.swatch').forEach((s, i) =>
            s.classList.toggle('active', PRESETS[i].light.toLowerCase() === boardColors.light.toLowerCase() && PRESETS[i].dark.toLowerCase() === boardColors.dark.toLowerCase()));
        const save = () => { applyBoardColors(); LG.store.set('pawns:board', boardColors); mark(); };
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
        mark();
        return wrap;
    });

    // Сторінку не можна гортати пальцем (крім списку суперників і вікон)
    document.addEventListener('touchmove', e => {
        if (!e.target.closest('.lg-modal, .picker-card')) e.preventDefault();
    }, { passive: false });

    document.addEventListener('DOMContentLoaded', () => {
        paintHero();
        updateCoords();
        renderMaterial();
    });
})();
