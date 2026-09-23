// --- Game Constants ---
const BOARD_SIZE = 8;
const WHITE_PAWN_CHAR = '♟';
const BLACK_PAWN_CHAR = '♟';
const MAX_HINTS_MEDIUM = Infinity; // Было 3
const MAX_UNDOS_MEDIUM = Infinity; // Было 3
const AI_THINKING_DELAY_MS = 800;
const HINT_HIGHLIGHT_DURATION_MS = 4000;
const MIN_DRAG_DISTANCE = 5; // Pixels to start drag
const CAT_API_TIMEOUT_MS = 7000; // Increased timeout slightly (used by legacy unused modal code in ui.js)

// --- GUARANTEED CAT FALLBACK ---
const fallbackCatImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E😹%3C/text%3E%3C/svg%3E`; // Fallback SVG emoji

// --- Opponent Definitions (using local images) ---
const opponents = [
    { name: 'Хом’ячок', difficulty: 'very_easy', avatar: 'img/avatars/hamster.png' },
    { name: 'Бананіта Дельфініта', difficulty: 'very_easy', avatar: 'img/avatars/bananita.jpg' },
    { name: 'Балерина Капучина', difficulty: 'very_easy', avatar: 'img/avatars/ballerina.jpg' },
    { name: 'Мавпочка', difficulty: 'completely_random', avatar: 'img/avatars/monkey.png' },
    { name: 'Шимпанзіні Бананіні', difficulty: 'completely_random', avatar: 'img/avatars/chimpanzini.jpg' },
    { name: 'Лірілі Ларіла', difficulty: 'completely_random', avatar: 'img/avatars/lirili.jpg' },
    { name: 'Капібара', difficulty: 'easy', avatar: 'img/avatars/capybara.jpg' },
    { name: 'Тралалело Тралала', difficulty: 'easy', avatar: 'img/avatars/tralalero.jpg' },
    { name: 'Бурбалоні Лулілолі', difficulty: 'easy', avatar: 'img/avatars/burbaloni.jpg' },
    { name: 'Ракуні Вотермелуні', difficulty: 'easy', avatar: 'img/avatars/raccooni.jpg' },
    { name: 'Сова', difficulty: 'easy', avatar: 'img/avatars/owl.jpg' },
    { name: 'Кіт', difficulty: 'medium', avatar: 'img/avatars/cat.jpg' },
    { name: 'Блуберіні Октопусіні', difficulty: 'medium', avatar: 'img/avatars/blueberini.jpg' },
    { name: 'Фріго Камело', difficulty: 'medium', avatar: 'img/avatars/frigo.jpg' },
    { name: 'Свініно Бомбондіно', difficulty: 'medium', avatar: 'img/avatars/svinino.jpg' },
    { name: 'Видра', difficulty: 'medium', avatar: 'img/avatars/otter.jpg' },
    { name: 'Собака', difficulty: 'advanced', avatar: 'img/avatars/dog.jpg' },
    { name: 'Тун-тун-тун-сахур', difficulty: 'advanced', avatar: 'img/avatars/tung-tung.jpg' },
    { name: 'Брр Брр Патапім', difficulty: 'advanced', avatar: 'img/avatars/patapim.jpg' },
    { name: 'Кокофанто Елефанто', difficulty: 'advanced', avatar: 'img/avatars/cocofanto.jpg' },
    { name: 'Тріппі Тропі', difficulty: 'advanced', avatar: 'img/avatars/trippi.jpg' },
    { name: 'Пінгвін', difficulty: 'hard', avatar: 'img/avatars/penguin.jpg' },
    { name: 'Горілло Вотермелондрілло', difficulty: 'hard', avatar: 'img/avatars/gorillo.jpg' },
    { name: 'Глорбо Фруттодрілло', difficulty: 'hard', avatar: 'img/avatars/glorbo.jpg' },
    { name: 'Ла Вака Сатурно', difficulty: 'hard', avatar: 'img/avatars/vaca.jpg' },
    { name: 'У Дін Дін Дун', difficulty: 'hard', avatar: 'img/avatars/udin.jpg' },
    { name: 'Тигр', difficulty: 'expert', avatar: 'img/avatars/tiger.jpg' },
    { name: 'Бомбардіро Крокоділо', difficulty: 'expert', avatar: 'img/avatars/bombardiro.jpg' },
    { name: 'Ріно Тостеріно', difficulty: 'expert', avatar: 'img/avatars/rhino.jpg' }
];

// --- Minimax AI Constants --- 
const PAWN_VALUE = 10;
const ADVANCEMENT_BONUS = [0, 1, 1, 2, 3, 5, 8, 0]; // Bonus per rank advanced (index from start row for that color)
const PROMOTION_VALUE = 90; // Big bonus for reaching the end
const CAPTURE_BONUS = 5; // Bonus per captured piece advantage
const WIN_SCORE = 10000;
const MAX_DEPTH_EXPERT = 7; // Depth for Expert AI (увеличено с 5 до 7)
const MAX_DEPTH_HARD = 5; // Depth for Hard AI (увеличено с 4 до 5)
const MAX_DEPTH_ADVANCED = 3; // Depth for Advanced AI
const MAX_DEPTH_MEDIUM = 2; // Depth for Medium AI
const MAX_DEPTH_EASY = 1; // Depth for Easy AI
const MAX_DEPTH_VERY_EASY = 0; // Depth for Very Easy AI
const MAX_DEPTH_COMPLETELY_RANDOM = 0; // Depth for Completely Random AI (обезьяна)

// --- Game State Variables ---
let boardState = []; // 2D array [row][col] -> 'w', 'b', or null
let currentPlayer = 'w'; // 'w' or 'b'
let playerColor = 'w'; // Color controlled by human at bottom ('w' or 'b')
let aiColor = 'b'; // AI's color in PvAI mode
let gameMode = 'pvai'; // 'pvai' or 'pvp'
let aiDifficulty = 'medium'; // 'easy', 'medium', 'hard', or null in PvP
let currentOpponentIndex = 0; // завжди хом'ячок при відкритті сторінки
let moveHistory = []; // Array of past game states for undo
let lastMove = null; // { from: {r,c}, to: {r,c}, ... }
let enPassantTargetSquare = null; // { row, col } or null
let isEnPassantEnabled = true; // Boolean flag
let capturedCounts = { w: 0, b: 0 }; // Internal counts for history/state
let hintsRemaining = 0; // Number or Infinity
let undosRemaining = 0; // Number or Infinity
let gameOver = false; // Boolean flag
let aiThinking = false; // Boolean flag to prevent player interaction
let hintHighlightTimeout = null; // Timeout ID for hint highlight
let catObjectURL = null; // For releasing cat image blob
let hintHighlightedSquares = null; // Store the squares that are highlighted by hint

// Interaction State (Touch & Click)
const touchState = {
    identifier: null, isDragging: false, startSquare: null, currentSquareEl: null,
    pieceElement: null, cloneElement: null, validMoves: [], boardRect: null,
    pieceOffsetX: 0, pieceOffsetY: 0
};
let selectedSquare = null; // { row, col } for click selection
let clickValidMoves = []; // Valid moves for the clicked piece

// --- Game Initialization & Main Logic ---

// Initializes or restarts the game
function initGame(keepOpponent = false, mode = 'pvai') {
    console.log(`Initializing game: KeepOpponent=${keepOpponent}`);
    refillRewardPool(); // тримаємо наступне відео-нагороду напоготові
    gameOver = false;
    aiThinking = false;
    moveHistory = [];
    lastMove = null;
    enPassantTargetSquare = null;
    capturedCounts = { w: 0, b: 0 };
    isEnPassantEnabled = !!(window.LG && LG.store.get('pawns:ep', false)); // налаштування
    
    // Clear any hint highlights
    if (hintHighlightedSquares) {
        const fromHintSq = getSquareElement(hintHighlightedSquares.from.row, hintHighlightedSquares.from.col);
        const toHintSq = getSquareElement(hintHighlightedSquares.to.row, hintHighlightedSquares.to.col);
        
        if (fromHintSq) fromHintSq.classList.remove('hint-highlight');
        if (toHintSq) toHintSq.classList.remove('hint-highlight');
        if (typeof clearHintArrow === 'function') clearHintArrow();
    }
    
    if (hintHighlightTimeout) clearTimeout(hintHighlightTimeout);
    hintHighlightTimeout = null;
    hintHighlightedSquares = null;
    
    cleanupInteractionState(false);

    gameMode = 'pvai'; // Всегда режим игры с AI
    currentPlayer = 'w'; // White always starts

    // Mode Specific Setup
    bodyEl.classList.remove('pvp-mode'); // Удаляем класс pvp-mode
    opponentSelector.style.opacity = '1';
    opponentSelector.style.visibility = 'visible';

    if (!keepOpponent) {
        // Reset to white unless specifically flipping/keeping opponent state
        // The flip logic handles setting playerColor before calling initGame
         if (playerColor !== 'b') playerColor = 'w'; // Keep 'b' if it was set by flip
    }
     aiColor = (playerColor === 'w') ? 'b' : 'w';

    if (opponents.length === 0) {
        console.error("CRITICAL: No opponents defined!");
        return;
    }
    currentOpponentIndex = Math.max(0, Math.min(currentOpponentIndex, opponents.length - 1));
    const currentOpponent = opponents[currentOpponentIndex];
    aiDifficulty = currentOpponent.difficulty;
    // Складність можна незалежно перебити з налаштувань (тварину це не чіпає)
    if (window.LG) {
        const diffOverride = LG.store.get('pawns:aiDifficultyOverride', null);
        if (diffOverride) aiDifficulty = diffOverride;
    }
    aiAvatar.src = currentOpponent.avatar; // Use embedded SVG
    aiAvatar.alt = currentOpponent.name;
    updateOpponentLabel();
    console.log(`PvAI Opponent: ${currentOpponent.name} (${aiDifficulty})`);

    switch (aiDifficulty) {
        case 'completely_random': hintsRemaining = Infinity; undosRemaining = Infinity; break;
        case 'very_easy': hintsRemaining = Infinity; undosRemaining = Infinity; break;
        case 'easy': hintsRemaining = MAX_HINTS_MEDIUM; undosRemaining = MAX_UNDOS_MEDIUM; break;
        case 'medium': hintsRemaining = MAX_HINTS_MEDIUM; undosRemaining = MAX_UNDOS_MEDIUM; break;
        case 'advanced': hintsRemaining = MAX_HINTS_MEDIUM; undosRemaining = MAX_UNDOS_MEDIUM; break;
        case 'hard': hintsRemaining = MAX_HINTS_MEDIUM; undosRemaining = MAX_UNDOS_MEDIUM; break;
        case 'expert': hintsRemaining = MAX_HINTS_MEDIUM; undosRemaining = MAX_UNDOS_MEDIUM; break;
    }

    // Обмеження кількості підказок і ходів назад з налаштувань (якщо задане)
    if (window.LG) {
        const hintCap = LG.store.get('pawns:hintLimit', 'inf');
        if (hintCap !== 'inf') hintsRemaining = Number(hintCap);
        const undoCap = LG.store.get('pawns:undoLimit', 'inf');
        if (undoCap !== 'inf') undosRemaining = Number(undoCap);
    }

    // Common Setup
    boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    for (let c = 0; c < BOARD_SIZE; c++) {
        boardState[1][c] = 'b'; // Black pawns row 1 (index 1)
        boardState[6][c] = 'w'; // White pawns row 6 (index 6)
    }

    const shouldBeFlipped = playerColor === 'b';
    chessboardEl.classList.toggle('flipped', shouldBeFlipped);

    // Set circle color on flip board button to the OPPOSITE of the player's color
    // Only if we're not coming from a flipBoard call (check if we're initializing the game from scratch)
    if (!keepOpponent || gameMode !== 'pvai') {
        const flipButton = document.getElementById('flip-board-button');
        flipButton.dataset.side = playerColor; 
    }

    updateEnPassantButton();
    updateButtonStates();
    renderBoard();
    hideWinModal();

    if (currentPlayer === aiColor && !gameOver) {
        console.log("AI's turn right after init, triggering AI move.");
        triggerAiMoveWithDelay();
    }
    console.log(`Game Initialized. Turn: ${currentPlayer}. Player(bottom): ${playerColor}. EP: ${isEnPassantEnabled}. Flipped: ${shouldBeFlipped}`);

    resetCapturedPawnsCounter();
}

function checkGameOver() {
    let whiteWins = false; let blackWins = false;
    let whitePawns = 0; let blackPawns = 0;
    let whiteHasMoves = false; let blackHasMoves = false;
    const whiteEndRow = 0; const blackEndRow = 7;

    // Internal function to count pieces and check end row
    function analyzeBoard() {
         let w = 0, b = 0; let wWin = false; let bWin = false;
         for (let r = 0; r < BOARD_SIZE; r++) {
             for (let c = 0; c < BOARD_SIZE; c++) {
                 const piece = boardState[r]?.[c];
                 if (piece === 'w') { w++; if (r === whiteEndRow) wWin = true; }
                 else if (piece === 'b') { b++; if (r === blackEndRow) bWin = true; }
             }
         }
         return { whitePawns: w, blackPawns: b, whiteWinsByPromotion: wWin, blackWinsByPromotion: bWin };
    }

    const boardAnalysis = analyzeBoard();
    whitePawns = boardAnalysis.whitePawns;
    blackPawns = boardAnalysis.blackPawns;
    whiteWins = boardAnalysis.whiteWinsByPromotion;
    blackWins = boardAnalysis.blackWinsByPromotion;

    // Check if current player has ANY valid moves
    const currentPlayerMoves = getAllMovesForAI(currentPlayer, boardState, enPassantTargetSquare);
    const currentPlayerHasMoves = currentPlayerMoves.length > 0;

    // Determine win conditions
    if (!whiteWins && !blackWins) { // Check other conditions only if no promotion win
        if (blackPawns === 0 && whitePawns > 0) whiteWins = true; // All black captured
        else if (whitePawns === 0 && blackPawns > 0) blackWins = true; // All white captured
        else if ((whitePawns > 0 || blackPawns > 0) && !currentPlayerHasMoves) { 
            // Changed: If the current player has no moves, it's a DRAW now, not a win for the other player
            gameOver = true; aiThinking = false;
            let finalMessage = "Нічия - немає доступних ходів";
            console.log(`Draw detected - no moves available for ${currentPlayer}`);
            updateButtonStates();
            LG.draw('Ні в кого немає ходів — пішаки заблокували одне одного.', { onAgain: () => initGame(false, gameMode) });
            console.log(`Final Outcome: ${finalMessage}`);
            return true; // Game is over with a draw
        }
    }

    // Determine Winner and End Game
    if (whiteWins || blackWins) {
        gameOver = true; aiThinking = false; // Ensure AI stops
        const winnerColor = whiteWins ? 'w' : 'b';
        
        let finalMessage = winnerColor === playerColor ? "Перемога!" : "Ти програв :(";
        let playWinSound = false;
        let showCat = false;
        
        console.log(`Game Over Detected. Winner: ${winnerColor}. Player Color: ${playerColor}`);

        if (winnerColor === playerColor) {
            playWinSound = true;
            showCat = true; // Show cat only on player win
        }

        updateButtonStates(); // Disable appropriate buttons
        const again = { onAgain: () => initGame(false, gameMode) };
        if (winnerColor === playerColor) {
            const name = opponents[currentOpponentIndex] ? opponents[currentOpponentIndex].name : 'суперника';
            LG.win('Ти переміг: ' + name + '! Спробуй наступного, сильнішого суперника ▶', Object.assign({ image: takeRewardGif(), video: true }, again));
        } else {
            LG.lose('Цього разу виграв суперник. Спробуй підказку 💡 або скасуй хід ↩️.', again);
        }
        console.log(`Final Outcome: ${finalMessage}`);
        return true; // Game is over
    }
    return false; // Game is not over
}

// Найкращий хід для підказки: одразу виграти, інакше мінімакс з поглибленням
// (скільки встигне за ~0.5 с), при рівності — бити пішака, потім іти вперед.
function bestHintMove(moves, board, color, ep) {
    const win = moves.find(m => m.reachesEnd);
    if (win) return win;
    const adv = m => color === 'w' ? m.from.row - m.to.row : m.to.row - m.from.row;
    const tie = m => (m.isCapture ? 100 : 0) + adv(m) * 10 + (color === 'w' ? 6 - m.to.row : m.to.row - 1);
    let best = moves.slice().sort((a, b) => tie(b) - tie(a))[0];
    const start = performance.now();
    let lastDepthMs = 0;
    for (let depth = 2; depth <= 7; depth++) {
        // Наступна глибина рахується в кілька разів довше — не починаємо, якщо не встигнемо
        if (depth > 2 && performance.now() - start + lastDepthMs * 5 > 350) break;
        const depthStart = performance.now();
        let bestScore = -Infinity, bestAtDepth = null;
        for (const m of moves) {
            const { nextBoard, nextEpTarget } = simulateMove(board, m, color);
            const sc = minimax(nextBoard, depth - 1, -Infinity, Infinity, false, nextEpTarget, color, depth) + tie(m) / 1000;
            if (sc > bestScore) { bestScore = sc; bestAtDepth = m; }
        }
        if (bestAtDepth) best = bestAtDepth;
        lastDepthMs = performance.now() - depthStart;
    }
    return best;
}

function requestHint() {
    // Підказка працює завжди у твій хід — навіть якщо пішака вже вибрана чи затиснута
    if (selectedSquare || touchState.isDragging || touchState.identifier !== null) {
        if (dragAnimationId) { cancelAnimationFrame(dragAnimationId); dragAnimationId = null; }
        cleanupInteractionState(true);
        renderBoard();
    }
    if (!canRequestHint()) return;
    // Clear any existing hint before showing a new one
    if (hintHighlightedSquares) {
        const fromHintSq = getSquareElement(hintHighlightedSquares.from.row, hintHighlightedSquares.from.col);
        const toHintSq = getSquareElement(hintHighlightedSquares.to.row, hintHighlightedSquares.to.col);
        if (fromHintSq) fromHintSq.classList.remove('hint-highlight');
        if (toHintSq) toHintSq.classList.remove('hint-highlight');
        if (typeof clearHintArrow === 'function') clearHintArrow();
        hintHighlightedSquares = null;
        if (hintHighlightTimeout) {
            clearTimeout(hintHighlightTimeout);
            hintHighlightTimeout = null;
        }
    }

    if (!canRequestHint()) { 
        console.log("Hint not available."); 
        return; 
    }

    if (hintsRemaining !== Infinity && hintsRemaining > 0) {
        hintsRemaining--;
        console.log(`Hint used. Remaining: ${hintsRemaining}`);
    } else if (hintsRemaining === 0) {
        console.log("No hints remaining."); 
        return; 
    }
    updateButtonStates();

    const boardCopy = JSON.parse(JSON.stringify(boardState));
    const epCopy = enPassantTargetSquare ? JSON.parse(JSON.stringify(enPassantTargetSquare)) : null;
    const playerMoves = getAllMovesForAI(currentPlayer, boardCopy, epCopy);

    if (playerMoves.length > 0) {
        // Підказка — найкращий хід, який вдається знайти (без випадковості)
        let bestMove = bestHintMove(playerMoves, boardCopy, currentPlayer, epCopy);

        if (bestMove) {
            clearVisualState(); renderBoard(); // Clean slate before showing hint
            const fromSq = getSquareElement(bestMove.from.row, bestMove.from.col);
            const toSq = getSquareElement(bestMove.to.row, bestMove.to.col);

            if (fromSq && toSq) {
                // Apply the hint highlights
                fromSq.classList.add('hint-highlight');
                toSq.classList.add('hint-highlight');
                
                // Store the highlighted squares to clear them later
                hintHighlightedSquares = { 
                    from: { row: bestMove.from.row, col: bestMove.from.col },
                    to: { row: bestMove.to.row, col: bestMove.to.col }
                };
                if (typeof showHintArrow === 'function') showHintArrow(hintHighlightedSquares);
                
                console.log("Hint displayed - will remain until a move is made");
            } else {
                console.error("Hint squares not found for move:", bestMove);
                if (hintsRemaining !== Infinity) hintsRemaining++; // Refund hint
            }
        } else {
            console.warn("Hint requested, but AI couldn't determine a best move.");
            if (hintsRemaining !== Infinity) hintsRemaining++; 
        }
    } else {
        console.warn("Hint requested, but no valid moves available for player.");
        if (hintsRemaining !== Infinity && hintsRemaining >=0) hintsRemaining++; // Refund hint if no moves possible
    }
    // Разблокируем кнопку сразу после показа подсказки
    setTimeout(() => updateButtonStates(), 0);
}

// --- Move Logic Functions (from moves.js) ---

function getValidPawnMoves(row, col, color, currentBoard, epTarget) {
    const moves = [];
    const dir = (color === 'w') ? -1 : 1; // White moves up (-1), Black moves down (+1)
    const startRow = (color === 'w') ? 6 : 1;

    // 1. Forward move (one step)
    const oneStepR = row + dir;
    if (isValidSquare(oneStepR, col) && !currentBoard[oneStepR]?.[col]) {
        moves.push({ row: oneStepR, col: col, isCapture: false, isEnPassant: false });
        // 2. Forward move (two steps)
        const twoStepR = oneStepR + dir;
        if (row === startRow && isValidSquare(twoStepR, col) && !currentBoard[twoStepR]?.[col]) {
            moves.push({ row: twoStepR, col: col, isCapture: false, isEnPassant: false });
        }
    }

    // 3. Diagonal captures (normal and en passant)
    [col - 1, col + 1].forEach(capC => {
        if (isValidSquare(oneStepR, capC)) {
            const targetPiece = currentBoard[oneStepR]?.[capC];
            // Normal capture
            if (targetPiece && targetPiece !== color) {
                moves.push({ row: oneStepR, col: capC, isCapture: true, isEnPassant: false });
            }
            // En passant capture
            else if ( isEnPassantEnabled && !targetPiece && // Target square must be empty
                    epTarget && oneStepR === epTarget.row && capC === epTarget.col && // Must match EP target
                    currentBoard[row]?.[capC] && currentBoard[row][capC] !== color // Pawn to capture must exist adjacent ON STARTING ROW
                    ) {
                moves.push({ row: oneStepR, col: capC, isCapture: true, isEnPassant: true });
            }
        }
    });
    return moves;
}

function updateCapturedPawnsCounter(delta = 1) {
    const counter = document.getElementById('captured-pawns-counter');
    const countElement = counter.querySelector('.count');
    const pawnIcon = counter.querySelector('.pawn-icon');
    
    // Показываем пешки, которые текущий игрок захватил у противника
    // При переворачивании доски используем capturedCounts, соответствующий текущему aiColor
    const capturedByPlayer = capturedCounts[aiColor];
    
    // Update count directly from the tracking variable instead of incrementing
    countElement.textContent = capturedByPlayer;
    if (typeof renderMaterial === 'function') renderMaterial();
    
    // Set standard pawn emoji regardless of player color
    pawnIcon.textContent = '♟️';
    pawnIcon.style.color = ''; // Remove explicit color styling
}

function resetCapturedPawnsCounter() {
    const counter = document.getElementById('captured-pawns-counter');
    const countElement = counter.querySelector('.count');
    const pawnIcon = counter.querySelector('.pawn-icon');
    
    // Сбрасываем значения для обоих цветов в переменных отслеживания
    capturedCounts = { w: 0, b: 0 };
    
    // Обновляем отображаемый счетчик
    countElement.textContent = '0';
    if (typeof renderMaterial === 'function') renderMaterial();
    
    // Set standard pawn emoji
    pawnIcon.textContent = '♟️';
    pawnIcon.style.color = ''; // Remove explicit color styling
}

function makeMove(fromRow, fromCol, toRow, toCol, isEnPassant = false, isCapture = false) {
    if (gameOver || (gameMode === 'pvai' && aiThinking)) return;

    // Clear hint highlights if they exist
    if (hintHighlightedSquares) {
        const fromHintSq = getSquareElement(hintHighlightedSquares.from.row, hintHighlightedSquares.from.col);
        const toHintSq = getSquareElement(hintHighlightedSquares.to.row, hintHighlightedSquares.to.col);
        
        if (fromHintSq) fromHintSq.classList.remove('hint-highlight');
        if (toHintSq) toHintSq.classList.remove('hint-highlight');
        if (typeof clearHintArrow === 'function') clearHintArrow();
        
        hintHighlightedSquares = null; // Reset the stored hint
        
        if (hintHighlightTimeout) {
            clearTimeout(hintHighlightTimeout);
            hintHighlightTimeout = null;
        }
    }

    const pieceColor = boardState[fromRow]?.[fromCol];
    if (!pieceColor) {
        console.error("Attempting move from invalid/empty square:", {fromRow, fromCol});
        cleanupInteractionState(true); renderBoard(); return;
    }

    // Ensure the move is actually valid according to current rules
     const validMoves = getValidPawnMoves(fromRow, fromCol, pieceColor, boardState, enPassantTargetSquare);
     const isValid = validMoves.some(m => m.row === toRow && m.col === toCol);
     if (!isValid) {
         console.warn("Attempted invalid move:", { from: { fromRow, fromCol }, to: { toRow, toCol } });
         cleanupInteractionState(true); renderBoard(); return;
     }

    saveToHistory(); // Save BEFORE making changes

    const isTwoStep = Math.abs(toRow - fromRow) === 2;
    let capturedPawnCoords = null;
    let wasCaptureReal = false; // Differentiate between intent (isCapture flag) and actual capture
    const prevEpTarget = enPassantTargetSquare ? { ...enPassantTargetSquare } : null;

    // Handle captures (EP first)
     const boardBeforeMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].boardState : boardState; // Use state BEFORE move

    if (isEnPassant && isCapture) {
        const capturedRow = (pieceColor === 'w') ? toRow + 1 : toRow - 1;
        const capturedCol = toCol;
        const capturedPiece = boardBeforeMove[capturedRow]?.[capturedCol]; // Check board *before* move
        if (capturedPiece && capturedPiece !== pieceColor) {
            capturedPawnCoords = { row: capturedRow, col: capturedCol, piece: capturedPiece };
            boardState[capturedRow][capturedCol] = null; // Remove pawn from board *now*
            wasCaptureReal = true;
            capturedCounts[pieceColor === 'w' ? 'b' : 'w']++;
            console.log("En passant capture executed.");
        } else {
            console.warn("En passant capture failed validation on execution.");
            isEnPassant = false; // Correct flags if EP failed
            isCapture = false;
        }
    } else if (isCapture) { // Normal capture
        const capturedPiece = boardBeforeMove[toRow]?.[toCol]; // Check board *before* move
        if (capturedPiece && capturedPiece !== pieceColor) {
            capturedPawnCoords = { row: toRow, col: toCol, piece: capturedPiece };
            // Piece will be overwritten below, no need to nullify here explicitly
            wasCaptureReal = true;
            capturedCounts[pieceColor === 'w' ? 'b' : 'w']++;
            console.log("Normal capture executed.");
        } else {
            console.warn("Normal capture failed validation on execution.");
            isCapture = false; // Correct flag if capture failed
        }
    }

    // Move the piece
    boardState[toRow][toCol] = pieceColor;
    boardState[fromRow][fromCol] = null;

    // Update EP target state
    enPassantTargetSquare = isTwoStep ? { row: (fromRow + toRow) / 2, col: toCol } : null;

    // Store move details using validated capture status
    lastMove = {
        from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol },
        piece: pieceColor, isTwoStep: isTwoStep,
        isEnPassant: isEnPassant && wasCaptureReal, // Only true if EP *and* capture occurred
        isCapture: wasCaptureReal, // True only if a piece was actually captured
        capturedInfo: capturedPawnCoords, prevEnPassantTarget: prevEpTarget
    };

     // Associate the move that LED to the current state with the PREVIOUS history entry
    if (moveHistory.length > 0) {
         moveHistory[moveHistory.length - 1].moveMadeToReachThisState = lastMove;
    }

    // Post-move updates
    playSound(wasCaptureReal ? captureSound : moveSound);
    cleanupInteractionState(false); // Clean interaction state AFTER move logic
    
    // Обновляем отображение счетчика захваченных пешек
    updateCapturedPawnsCounter(0);
    
    renderBoard(); // Render the updated board

    if (checkGameOver()) return; // Check win state

    switchPlayer(); // Switch turn
}

function saveToHistory() {
    const historyEntry = {
        boardState: JSON.parse(JSON.stringify(boardState)),
        currentPlayer: currentPlayer,
        capturedCounts: JSON.parse(JSON.stringify(capturedCounts)),
        enPassantTargetSquare: enPassantTargetSquare ? JSON.parse(JSON.stringify(enPassantTargetSquare)) : null,
        undosRemaining: undosRemaining, hintsRemaining: hintsRemaining,
        isEnPassantEnabled: isEnPassantEnabled, gameMode: gameMode,
        playerColor: playerColor, aiColor: aiColor, aiDifficulty: aiDifficulty,
        moveMadeToReachThisState: null, // Will be filled by makeMove AFTER this state is pushed
        lastMoveBeforeThisState: lastMove ? JSON.parse(JSON.stringify(lastMove)) : null // Store the move that LED TO this state being saved
    };
    moveHistory.push(historyEntry);
    // console.log("State saved to history. Depth:", moveHistory.length);
}

function undoMove() {
    if (!canUndo()) { console.log("Undo not possible."); return; }
    cleanupInteractionState(true); // Clean UI state

    let entriesToUndo = 0;
    if (gameMode === 'pvai') {
        // If it's player's turn, undo player's last move AND AI's last move (2 steps)
        // If it's AI's turn, undo player's last move (1 step) - this case shouldn't happen if button is correctly disabled
        entriesToUndo = (currentPlayer === playerColor && moveHistory.length >= 2) ? 2 :
                        (currentPlayer === aiColor && moveHistory.length >= 1) ? 1 : 0;
    } else if (gameMode === 'pvp' && moveHistory.length >= 1) {
        entriesToUndo = 1; // Always undo one step in PvP
    }

    if (entriesToUndo === 0 || moveHistory.length < entriesToUndo) {
        console.warn(`Undo failed: Need ${entriesToUndo} history entries, have ${moveHistory.length}.`); 
        return;
    }
    console.log(`Undoing ${entriesToUndo} step(s).`);

    let stateToRestore = null;
    for (let i = 0; i < entriesToUndo; i++) {
        stateToRestore = moveHistory.pop();
    }

    if (stateToRestore) {
        // Restore state variables from the popped entry
        boardState = stateToRestore.boardState;
        currentPlayer = stateToRestore.currentPlayer;
        capturedCounts = stateToRestore.capturedCounts;
        enPassantTargetSquare = stateToRestore.enPassantTargetSquare;
        undosRemaining = stateToRestore.undosRemaining; 
        hintsRemaining = stateToRestore.hintsRemaining;
        isEnPassantEnabled = stateToRestore.isEnPassantEnabled;
        gameMode = stateToRestore.gameMode; // Restore mode in case it changed
        playerColor = stateToRestore.playerColor; // Restore player color
        aiColor = stateToRestore.aiColor;
        aiDifficulty = stateToRestore.aiDifficulty;
        lastMove = stateToRestore.lastMoveBeforeThisState; // Restore the last move marker
        gameOver = false; // Game is no longer over if undoing
        aiThinking = false; // Stop AI thinking

        // Update UI to match restored state
        updateEnPassantButton();
        chessboardEl.classList.toggle('flipped', gameMode === 'pvai' && playerColor === 'b');
        bodyEl.classList.toggle('pvp-mode', gameMode === 'pvp'); // Update pvp class
        
        // Update UI elements that might be present for PvP/PvAI toggle
        if (typeof pvpButtonText !== 'undefined' && pvpButtonText) {
            pvpButtonText.textContent = (gameMode === 'pvp') ? "Гра з AI" : "Гравець";
        }
        if (typeof pvpButton !== 'undefined' && pvpButton) {
            pvpButton.title = (gameMode === 'pvp') ? "Гра з AI" : "Гра з другом";
        }
        
        // Update opponent selector visibility
        if (opponentSelector) {
            opponentSelector.style.opacity = (gameMode === 'pvp') ? '0' : '1';
            opponentSelector.style.visibility = (gameMode === 'pvp') ? 'hidden' : 'visible';
        }

        // Аватар суперника ходом «Назад» не чіпаємо — лишається той, кого обрала дитина.
        updateOpponentLabel();

        renderBoard(); // Render the restored board state
        updateButtonStates(); // Update button enabled/disabled states
        console.log("Undo successful. Current turn:", currentPlayer);

        // Обновляем отображение счетчика захваченных пешек
        // Теперь не нужно уменьшать счетчик, так как мы просто отображаем общий счет из capturedCounts
        updateCapturedPawnsCounter(0);

    } else if (moveHistory.length === 0) {
        // This case should ideally be prevented by the initial check, but as a fallback:
        console.log("History empty after attempting undo, re-initializing game.");
        initGame(gameMode === 'pvai', gameMode); // Keep opponent/mode if possible
    }
}

function switchPlayer() {
    currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
}

// Update the flipBoard function to also update pawn color
function flipBoard() {
    playerColor = playerColor === 'w' ? 'b' : 'w';
    aiColor = aiColor === 'w' ? 'b' : 'w';
    chessboardEl.classList.toggle('flipped');
    
    // Обновляем счетчик захваченных пешек при смене сторон
    updateCapturedPawnsCounter(0);
    
    // Set circle color to the OPPOSITE of the player's color
    const flipButton = document.getElementById('flip-board-button');
    flipButton.dataset.side = playerColor; 
}


// Підпис суперника під аватаром: ім'я і рівень
function updateOpponentLabel() {
    const nameEl = document.getElementById('ai-name');
    const levelEl = document.getElementById('ai-level');
    const o = opponents[currentOpponentIndex];
    if (nameEl && o) nameEl.textContent = o.name;
    if (levelEl) levelEl.textContent = 'Рівень ' + (currentOpponentIndex + 1) + ' з ' + opponents.length;
}

// --- Смішні відео з тваринками за перемогу ---
// 40 коротких беззвучних відео (img/rewards, ~70 КБ кожне) — виглядають як гіфки,
// але набагато легші. Наступне завантажуємо в пам'ять заздалегідь, тож у момент
// перемоги воно відтворюється одразу.
const REWARD_COUNT = 40;
// MP4 (H.264) грає на телефонах; якщо браузер його не вміє — беремо WebM
const REWARD_EXT = (() => {
    const v = document.createElement('video');
    return v.canPlayType('video/mp4; codecs="avc1.4D401E"') ? '.mp4' : '.webm';
})();
let rewardBag = [];
let nextReward = null; // Promise<string> — адреса відео (blob: або звичайна)

function pickRewardUrl() {
    if (!rewardBag.length) {
        rewardBag = Array.from({ length: REWARD_COUNT }, (_, i) => i + 1);
        for (let i = rewardBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rewardBag[i], rewardBag[j]] = [rewardBag[j], rewardBag[i]];
        }
    }
    return 'img/rewards/fun-' + String(rewardBag.pop()).padStart(2, '0') + REWARD_EXT;
}

function refillRewardPool() {
    if (nextReward) return;
    const url = pickRewardUrl();
    const ready = fetch(url).then(r => r.ok ? r.blob() : Promise.reject())
        .then(b => URL.createObjectURL(b)).catch(() => url);
    nextReward = { url, ready, settled: null };
    ready.then(u => { if (nextReward && nextReward.ready === ready) nextReward.settled = u; });
}

function takeRewardGif() {
    refillRewardPool();
    const r = nextReward;
    nextReward = null;
    refillRewardPool(); // одразу готуємо наступне
    // Уже в пам'яті — віддаємо рядок одразу, без жодного очікування
    return r.settled || r.ready;
}

refillRewardPool();
