// --- User Interaction Logic ---
let dragAnimationId = null; // ID for requestAnimationFrame
let latestTouchX = 0;
let latestTouchY = 0;

const boardThemes = [
    'theme-default', // Classic beige/brown
    'theme-emerald', // Light green/dark green
    'theme-blue',    // Light blue/dark blue
    'theme-rose',    // Light pink/dark pink
    'theme-gray',    // Light gray/dark gray
    'theme-walnut'   // Light wood/dark wood
];
let currentThemeIndex = 0;

// --- Interaction Handlers (Touch & Click) ---
function cleanupInteractionState(restoreOriginalVisibility = true) {
    // Удаляем клон если существует
    if (touchState.cloneElement) {
        touchState.cloneElement.remove();
    }
    
    // Восстанавливаем видимость оригинальной пешки если нужно
    const originalPiece = touchState.pieceElement;
    if (restoreOriginalVisibility && originalPiece) {
        originalPiece.style.display = '';
        originalPiece.style.visibility = '';
        originalPiece.style.opacity = '';
        originalPiece.classList.remove('touch-hidden-original');
    }

    // Сбрасываем состояние touch
    Object.assign(touchState, {
        identifier: null, isDragging: false, startSquare: null, currentSquareEl: null,
        pieceElement: null, cloneElement: null, validMoves: [], boardRect: null,
        pieceOffsetX: 0, pieceOffsetY: 0
    });

    // Сбрасываем состояние клика
    selectedSquare = null;
    clickValidMoves = [];

    // Очищаем визуальные эффекты
    clearVisualState();
    // Применяем постоянные эффекты
    applyHighlights();
}

function handleTouchStart(event) {
    if (touchState.identifier !== null || gameOver || (gameMode === 'pvai' && aiThinking)) return;
    if (event.touches.length > 1) return; // Ignore multi-touch

    const touch = event.changedTouches[0];
    const targetSquare = touch.target.closest('.square');
    if (!targetSquare) return;
    const pieceEl = targetSquare.querySelector('.piece:not(.piece-touch-clone)'); // Ignore clones
    if (!pieceEl) return;

    const row = parseInt(targetSquare.dataset.row);
    const col = parseInt(targetSquare.dataset.col);
    const pieceColor = boardState[row]?.[col]; // Get color from state

    // Check if it's the current player's piece and turn
    if (!pieceColor || pieceColor !== currentPlayer) return;
    if (gameMode === 'pvai' && currentPlayer !== playerColor) return; // Ignore if not human player's turn in PvAI

    // --- Improved Touch Handling --- 
    // Don't prevent default immediately. Only prevent if a drag starts.
    // This allows click events to function more reliably on mobile.

    // If a piece was previously selected by click, clear that state
    if (selectedSquare) cleanupInteractionState(true);

    touchState.identifier = touch.identifier;
    touchState.isDragging = false; // Not dragging yet
    touchState.startSquare = { row, col };
    touchState.currentSquareEl = targetSquare; // Initial square
    touchState.pieceElement = pieceEl;
    touchState.boardRect = boardWrapper.getBoundingClientRect(); // Get board position once

    // Calculate offset within the piece where touch started
    const pieceRect = pieceEl.getBoundingClientRect();
    touchState.pieceOffsetX = touch.clientX - pieceRect.left;
    touchState.pieceOffsetY = touch.clientY - pieceRect.top;

    // Calculate valid moves immediately for potential drag/drop
    touchState.validMoves = getValidPawnMoves(row, col, currentPlayer, boardState, enPassantTargetSquare);

    // We still need to prevent the default *if* a drag actually starts.
    // We will do this in handleTouchMove when isDragging becomes true.
    // console.log(`TouchStart on ${row},${col}. Potential drag. Valid moves:`, touchState.validMoves);
}

// Розмір клітинки й «підйом» фігури над пальцем, щоб дитина бачила пішака
const DRAG_SCALE = 1.5;
function dragSquareSize() {
    return touchState.boardRect ? touchState.boardRect.width / BOARD_SIZE : 50;
}

function placeClone() {
    const clone = touchState.cloneElement;
    if (!clone) return null;
    const size = dragSquareSize() * DRAG_SCALE;
    const lift = dragSquareSize() * 0.45;
    // Центр фігури трохи вище пальця, але фігура не виходить за межі дошки
    const bw = touchState.boardRect.width, bh = touchState.boardRect.height;
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const cx = clamp(latestTouchX - touchState.boardRect.left, size / 2, bw - size / 2);
    const cy = clamp(latestTouchY - touchState.boardRect.top - lift, size / 2, bh - size / 2);
    clone.style.setProperty('--translate-transform', `translate(${cx - size / 2}px, ${cy - size / 2}px)`);
    // Клітинку під фігурою шукаємо в межах дошки
    return {
        x: touchState.boardRect.left + clamp(latestTouchX - touchState.boardRect.left, 1, bw - 1),
        y: touchState.boardRect.top + clamp(latestTouchY - touchState.boardRect.top - lift, 1, bh - 1)
    };
}

function updateClonePosition() {
    if (!touchState.isDragging || !touchState.cloneElement) {
        dragAnimationId = null;
        return;
    }

    const point = placeClone();

    // Клітинка під фігурою (клон не ловить подій — pointer-events: none)
    const elementBelow = document.elementFromPoint(point.x, point.y);
    const squareEl = elementBelow?.closest('#chessboard .square') || null;

    if (squareEl !== touchState.currentSquareEl) {
        if (touchState.currentSquareEl) {
            touchState.currentSquareEl.classList.remove('touch-drag-target-valid');
        }
        touchState.currentSquareEl = squareEl;
        highlightDropTarget();
    }

    dragAnimationId = requestAnimationFrame(updateClonePosition);
}

function handleTouchMove(event) {
    if (touchState.identifier === null) return;
    const touch = findTrackedTouch(event.changedTouches);
    if (!touch) return;

    // Store latest touch coordinates
    latestTouchX = touch.clientX;
    latestTouchY = touch.clientY;

    if (!touchState.isDragging) {
        const startClientX = touchState.boardRect.left + touchState.startSquare.col * (touchState.boardRect.width / BOARD_SIZE) + (touchState.boardRect.width / BOARD_SIZE / 2);
        const startClientY = touchState.boardRect.top + touchState.startSquare.row * (touchState.boardRect.height / BOARD_SIZE) + (touchState.boardRect.height / BOARD_SIZE / 2);
        const dx = latestTouchX - startClientX;
        const dy = latestTouchY - startClientY;
        if (Math.sqrt(dx * dx + dy * dy) >= MIN_DRAG_DISTANCE) {
            if (!startDragging()) {
                cleanupInteractionState(true);
                return;
            }
            event.preventDefault(); 
            // Animation loop is now started in startDragging
        } else {
            return; 
        }
    } else {
        event.preventDefault();
        // Animation loop should already be running
    }
    // Position update is now handled by updateClonePosition via rAF
}

function handleTouchEnd(event) {
    if (touchState.identifier === null) return;
    const touch = findTrackedTouch(event.changedTouches);
    if (!touch) return;

    // Stop the animation frame loop
    if (dragAnimationId) {
        cancelAnimationFrame(dragAnimationId);
        dragAnimationId = null;
    }

    let moveMade = false;
    // If we were dragging and ended over a valid square
    if (touchState.isDragging && touchState.currentSquareEl) {
        const row = parseInt(touchState.currentSquareEl.dataset.row);
        const col = parseInt(touchState.currentSquareEl.dataset.col);
        const targetMove = touchState.validMoves.find(m => m.row === row && m.col === col);
        if (targetMove) {
            makeMove(touchState.startSquare.row, touchState.startSquare.col, targetMove.row, targetMove.col, targetMove.isEnPassant, targetMove.isCapture);
            moveMade = true;
        }
    }

     // Cleanup interaction state.
     if (!moveMade) {
         cleanupInteractionState(true);
         renderBoard();
     } else {
        touchState.identifier = null; 
     }
}

function handleTouchCancel(event) {
    if (touchState.identifier === null) return;
    const touch = findTrackedTouch(event.changedTouches);
    if (!touch) return;

    // Stop the animation frame loop
    if (dragAnimationId) {
        cancelAnimationFrame(dragAnimationId);
        dragAnimationId = null;
    }

    console.log("TouchCancel detected");
    cleanupInteractionState(true);
    renderBoard();
}

// Helper to find the specific touch we started tracking
function findTrackedTouch(touchList) {
    for (let i = 0; i < touchList.length; i++) {
        if (touchList[i].identifier === touchState.identifier) return touchList[i];
    }
    return null; // Touch not found in the list
}

// Creates the visual clone for dragging
function startDragging() {
    if (!touchState.pieceElement || touchState.isDragging) return false;

    touchState.isDragging = true;
    const originalPiece = touchState.pieceElement;
    const color = boardState[touchState.startSquare.row]?.[touchState.startSquare.col];

    // Клон — просто картинка пішака потрібного кольору, у 1,5 раза більша за клітинку
    const clone = document.createElement('div');
    clone.className = 'piece-touch-clone ' + (color === 'b' ? 'black' : 'white');
    const size = dragSquareSize() * DRAG_SCALE;
    clone.style.setProperty('--clone-width', `${size}px`);
    clone.style.setProperty('--clone-height', `${size}px`);
    touchState.cloneElement = clone;
    boardWrapper.appendChild(clone);
    touchState.currentSquareEl = null;
    placeClone();

    // Оригінал ховаємо, але місце на дошці лишається
    originalPiece.style.visibility = 'hidden';
    originalPiece.classList.add('touch-hidden-original');

    clearVisualState();
    applyHighlights();
    getSquareElement(touchState.startSquare.row, touchState.startSquare.col)?.classList.add('selected-piece-origin');

    if (!dragAnimationId) {
        dragAnimationId = requestAnimationFrame(updateClonePosition);
    }
    return true;
}

function handleClick(event) {
     // Ignore clicks if game over, AI thinking, or a touch drag is in progress
    if (gameOver || (gameMode === 'pvai' && aiThinking) || touchState.identifier !== null) return;

    const clickedSquareEl = event.target.closest('.square');
    if (!clickedSquareEl) return; // Clicked outside a square

    const row = parseInt(clickedSquareEl.dataset.row);
    const col = parseInt(clickedSquareEl.dataset.col);
    if (!isValidSquare(row, col)) return;

     // Ignore clicks if not player's turn in PvAI
     if (gameMode === 'pvai' && currentPlayer !== playerColor) return;

    const pieceOnSquare = boardState[row]?.[col];

    if (selectedSquare) { // A piece was already selected
        // Check if the clicked square is a valid move for the selected piece
        const targetMove = clickValidMoves.find(m => m.row === row && m.col === col);
        if (targetMove) {
            // Make the move
            makeMove(selectedSquare.row, selectedSquare.col, targetMove.row, targetMove.col, targetMove.isEnPassant, targetMove.isCapture);
            // makeMove calls cleanupInteractionState, so no need to call it here
        } else {
            // Clicked elsewhere - potentially selecting a different piece or deselecting
            const clickedOwnPiece = pieceOnSquare === currentPlayer;
            const isSameSquare = selectedSquare.row === row && selectedSquare.col === col;

            cleanupInteractionState(true); // Deselect the previous piece

            if (clickedOwnPiece && !isSameSquare) {
                // Clicked a *different* piece of the current player's color
                selectPieceOnClick(row, col); // Select the new piece
            } else {
                // Clicked an empty square, opponent's piece, or the same square again
                // Just needed to deselect, which cleanupInteractionState handled.
                // Re-render ensures highlights are correct after deselect.
                 renderBoard();
            }
        }
    } else { // No piece was selected previously
        if (pieceOnSquare === currentPlayer) {
            // Clicked on a piece belonging to the current player
            selectPieceOnClick(row, col); // Select this piece
        }
    }
}

function selectPieceOnClick(row, col) {
     cleanupInteractionState(true); // Clear any previous selection/drag state
    selectedSquare = { row, col };
    clickValidMoves = getValidPawnMoves(row, col, currentPlayer, boardState, enPassantTargetSquare);
     // console.log(`Clicked ${row},${col}. Valid moves:`, clickValidMoves);
    clearVisualState(); // Clear old highlights
    renderBoard();      // Render board first (to ensure piece is there)
    applyHighlights();  // Apply new highlights (selected square + valid moves)
}

// --- Button Handlers (from events.js) ---
function handleFlipBoard() {
    if (aiThinking) return; // Prevent flip during AI turn
    cleanupInteractionState(true); // Clear any interaction

    // Call flipBoard to handle the color switching and button updating
    flipBoard();
    
    console.log(`Board flipped. Player is now ${playerColor}. Restarting...`);
    // Restart game, keeping opponent, switching sides
    initGame(true);
}

function changeOpponent(direction) {
    if (gameMode !== 'pvai' || aiThinking || opponents.length <= 1) return;
    
    // Блокируем стрелку влево на первом сопернике (Хомяк) 
    // и стрелку вправо на последнем сопернике (Тигр)
    if ((currentOpponentIndex === 0 && direction === -1) || 
        (currentOpponentIndex === opponents.length - 1 && direction === 1)) {
        console.log("Выбор соперника заблокирован: достигнут предел.");
        return;
    }
    
    cleanupInteractionState(true);
    currentOpponentIndex = (currentOpponentIndex + direction + opponents.length) % opponents.length;
    // Changing opponent always restarts PvAI, player defaults back to white
    playerColor = 'w';
    console.log(`Changing opponent. New index: ${currentOpponentIndex}. Restarting PvAI with player as White.`);
    initGame(false, 'pvai'); // Restart PvAI with new opponent, player as white
}

function toggleEnPassant() {
     if (aiThinking || gameOver) return; // Prevent changes during AI turn or game end
    isEnPassantEnabled = !isEnPassantEnabled;
    updateEnPassantButton();
    console.log("En Passant Toggled:", isEnPassantEnabled);
    // If interaction was ongoing, changing EP rules invalidates it
    if (selectedSquare || touchState.isDragging) {
        cleanupInteractionState(true); renderBoard();
    }
    // Recalculate moves if a piece was selected
    if (selectedSquare) {
        clickValidMoves = getValidPawnMoves(selectedSquare.row, selectedSquare.col, currentPlayer, boardState, enPassantTargetSquare);
        applyHighlights(); // Reapply highlights with new EP rule
    }
}

function applyTheme(themeClass) {
    document.body.classList.remove(...boardThemes); // Remove all theme classes
    document.body.classList.add(themeClass);
    localStorage.setItem('boardTheme', themeClass); // Save preference
}

function cycleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % boardThemes.length;
    const newTheme = boardThemes[currentThemeIndex];
    applyTheme(newTheme);
    console.log(`Board theme changed to: ${newTheme}`);
}

// --- Register Events (from events.js) ---
function registerEvents() {
    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', cycleTheme);
    }

    // Game control buttons
    restartButton.addEventListener('click', () => { if (!aiThinking) initGame(true); });
    flipBoardButton.addEventListener('click', () => { if (!aiThinking && !gameOver) handleFlipBoard(); });
    undoButton.addEventListener('click', undoMove);
    document.getElementById('redo-button').addEventListener('click', redoMove);
    hintButton.addEventListener('click', requestHint);
    enPassantToggleButton.addEventListener('click', toggleEnPassant);
    
    // Opponent selector
    prevOpponentButton.addEventListener('click', () => changeOpponent(-1));
    nextOpponentButton.addEventListener('click', () => changeOpponent(1));
    
    // Modal buttons
    closeButton.addEventListener('click', () => {
        hideWinModal();
        updateButtonStates();
    });
    playAgainButton.addEventListener('click', () => {
        hideWinModal();
        initGame(true);
    });
    okButton.addEventListener('click', () => {
        hideWinModal();
        updateButtonStates();
    });
    
    // Also close modal when clicking outside
    winModal.addEventListener('click', (event) => {
        if (event.target === winModal) {
            hideWinModal();
            updateButtonStates();
        }
    });

     // Board interaction listeners (moved from board.js to here as they trigger interaction handlers)
    boardWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
    boardWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    boardWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
    boardWrapper.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    boardWrapper.addEventListener('click', handleClick);

    // Добавляем обработчики мыши
    boardWrapper.addEventListener('mousedown', handleMouseDown);
    boardWrapper.addEventListener('mousemove', handleMouseMove);
    boardWrapper.addEventListener('mouseup', handleMouseUp);
    boardWrapper.addEventListener('mouseleave', handleMouseUp); // Обработка выхода курсора за пределы доски

    console.log("All event listeners registered.");
}

// --- Main Initialization (from events.js) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Game script starting...");
    createBoardDOM(); // Now defined in ui.js, but called before events
    registerEvents();
    
    // Apply saved theme or default
    const savedTheme = localStorage.getItem('boardTheme');
    if (savedTheme && boardThemes.includes(savedTheme)) {
        currentThemeIndex = boardThemes.indexOf(savedTheme);
        applyTheme(savedTheme);
    } else {
        applyTheme(boardThemes[0]); // Apply default theme
    }
    
    initGame(false, 'pvai'); // Default to PvAI mode 
});

function handleMouseDown(event) {
    if (event.button !== 0 || gameOver || (gameMode === 'pvai' && aiThinking)) return; // Проверяем левую кнопку мыши

    const targetSquare = event.target.closest('.square');
    if (!targetSquare) return;
    const pieceEl = targetSquare.querySelector('.piece:not(.piece-touch-clone)');
    if (!pieceEl) return;

    const row = parseInt(targetSquare.dataset.row);
    const col = parseInt(targetSquare.dataset.col);
    const pieceColor = boardState[row]?.[col];

    if (!pieceColor || pieceColor !== currentPlayer) return;
    if (gameMode === 'pvai' && currentPlayer !== playerColor) return;

    if (selectedSquare) cleanupInteractionState(true);

    touchState.identifier = 'mouse'; // Используем специальный идентификатор для мыши
    touchState.isDragging = false;
    touchState.startSquare = { row, col };
    touchState.currentSquareEl = targetSquare;
    touchState.pieceElement = pieceEl;
    touchState.boardRect = boardWrapper.getBoundingClientRect();

    const pieceRect = pieceEl.getBoundingClientRect();
    touchState.pieceOffsetX = event.clientX - pieceRect.left;
    touchState.pieceOffsetY = event.clientY - pieceRect.top;

    touchState.validMoves = getValidPawnMoves(row, col, currentPlayer, boardState, enPassantTargetSquare);
}

function handleMouseMove(event) {
    if (touchState.identifier !== 'mouse') return;

    latestTouchX = event.clientX;
    latestTouchY = event.clientY;

    if (!touchState.isDragging) {
        const startClientX = touchState.boardRect.left + touchState.startSquare.col * (touchState.boardRect.width / BOARD_SIZE) + (touchState.boardRect.width / BOARD_SIZE / 2);
        const startClientY = touchState.boardRect.top + touchState.startSquare.row * (touchState.boardRect.height / BOARD_SIZE) + (touchState.boardRect.height / BOARD_SIZE / 2);
        const dx = latestTouchX - startClientX;
        const dy = latestTouchY - startClientY;
        if (Math.sqrt(dx * dx + dy * dy) >= MIN_DRAG_DISTANCE) {
            if (!startDragging()) {
                cleanupInteractionState(true);
                return;
            }
            event.preventDefault();
        } else {
            return;
        }
    } else {
        event.preventDefault();
    }
}

function handleMouseUp(event) {
    if (touchState.identifier !== 'mouse') return;

    if (dragAnimationId) {
        cancelAnimationFrame(dragAnimationId);
        dragAnimationId = null;
    }

    let moveMade = false;
    if (touchState.isDragging && touchState.currentSquareEl) {
        const row = parseInt(touchState.currentSquareEl.dataset.row);
        const col = parseInt(touchState.currentSquareEl.dataset.col);
        const targetMove = touchState.validMoves.find(m => m.row === row && m.col === col);
        if (targetMove) {
            makeMove(touchState.startSquare.row, touchState.startSquare.col, targetMove.row, targetMove.col, targetMove.isEnPassant, targetMove.isCapture);
            moveMade = true;
        }
    }

    if (!moveMade) {
        cleanupInteractionState(true);
        renderBoard();
    } else {
        touchState.identifier = null;
    }
}
