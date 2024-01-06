document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const board = document.getElementById('board');
    const squares = [];
    let playerColor = null; // 'white' or 'black'
    let selectedSquare = null;
    const black = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜', '♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'];
    const white = ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙', '♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'];
    let game = true;

    const myturn = createObservable(false, (newValue) => {
        const turn = document.getElementById('turn');
        if (newValue) {
            turn.innerText = `Your turn (${playerColor ? playerColor.toUpperCase() : ''})`;
        } else {
            turn.innerText = "Wait for your oponent..."
        }
    }, true);

    const lastMove = createObservable([], (newPosition, oldPosition) => {
        const [row, col] = newPosition;
        const [oldRow, oldCol] = oldPosition;
        if (row && col) {
            squares[row][col].classList.add('last-move');
        }
        if (oldRow && oldCol) {
            squares[oldRow][oldCol]?.classList.remove('last-move');
        }
    })

    socket.on('color', (color) => {
        playerColor = color;
    });

    socket.on('opponentMove', (data) => {
        const { startRow, startCol, endRow, endCol } = data;
        checkWin(endRow, endCol);
        squares[endRow][endCol].innerText = squares[startRow][startCol].innerText;
        squares[startRow][startCol].innerText = '';
    });

    socket.on('newTurn', (data) => {
        const { startRow, startCol, endRow, endCol } = data;
        myturn.setValue(true);
        lastMove.setValue([endRow, endCol])
        isHightLight(true);
    })

    socket.on('start', () => {
        if (playerColor === 'white') {
            myturn.setValue(true);
        }
        initializeBoard();
        isHightLight(true);
    })

    function initializeBoard() {
        board.textContent = '';
        for (let i = 0; i < 8; i++) {
            squares[i] = [];
            for (let j = 0; j < 8; j++) {
                const square = document.createElement('div');
                square.className = ((i + j) % 2 === 0) ? 'square white' : 'square black';
                square.dataset.row = i;
                square.dataset.col = j;
                square.addEventListener('click', squareClick);
                squares[i][j] = square;
                board.appendChild(square);
            }
        }
        setupPieces();
    }

    function setupPieces() {
        const startingPositions = [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
        ];

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                squares[i][j].innerText = startingPositions[i][j];
            }
        }
    }

    function squareClick(event) {
        if (game === false) {
            alert('Game over! Press play again to new game')
            return;
        }

        if (myturn.getValue() === false) {
            return;
        }

        const clickedSquare = event.target;
        const row = parseInt(clickedSquare.dataset.row);
        const col = parseInt(clickedSquare.dataset.col);
        const piece = squares[row][col].innerText;

        if (!selectedSquare && !piece) {
            return;
        }

        if (selectedSquare === clickedSquare) {
            // If already selected, deselect the square
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
        } else if (selectedSquare) {
            // It's a move request
            const selectedRow = parseInt(selectedSquare.dataset.row);
            const selectedCol = parseInt(selectedSquare.dataset.col);

            movePiece(selectedRow, selectedCol, row, col);
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
        } else {
            // Select the square
            selectedSquare = clickedSquare;
            selectedSquare.classList.add('selected');
        }
    }

    function movePiece(startRow, startCol, endRow, endCol) {
        if (validateMove(startRow, startCol, endRow, endCol)) {
            checkWin(endRow, endCol);
            squares[endRow][endCol].innerText = squares[startRow][startCol].innerText;
            squares[startRow][startCol].innerText = '';
            isHightLight(false);
            myturn.setValue(false);
            lastMove.setValue([endRow, endCol]);
            socket.emit('makeMove', { startRow, startCol, endRow, endCol });
        }
    }

    function checkWin(endRow, endCol) {
        const endPiece = squares[endRow][endCol].innerText;
        if (endPiece.toLowerCase() === '♔') {
            game = false;
        }
        if (endPiece.toLowerCase() === '♚') {
            game = false;
        }
    }

    function validateMove(startRow, startCol, endRow, endCol) {
        const startPiece = squares[startRow][startCol].innerText.toLowerCase();
        const endPiece = squares[endRow][endCol].innerText.toLowerCase();

        if (playerColor === 'white') {
            if (startPiece.toLowerCase() === '♙') {
                if (startCol === endCol) {
                    if (endPiece === '' && ((startRow === 6 && startRow - endRow <= 2) || startRow - endRow === 1)) {
                        return true;
                    } else {
                        return false;
                    }
                }

                if (Math.abs(startCol - endCol) === 1) {
                    if (Math.abs(startRow - endRow) === 1 && black.includes(endPiece)) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }

            if (startPiece === '♘' && (black.includes(endPiece) || endPiece === '')) {
                const dx = Math.abs(startCol - endCol);
                const dy = Math.abs(startRow - endRow);
                return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
            }
            if (startPiece === '♖' && (black.includes(endPiece) || endPiece === '')) {
                if (isBlock(startRow, startCol, endRow, endCol)) {
                    return false;
                }
                return (startRow === endRow || startCol === endCol);
            }
            if (startPiece === '♗' && (black.includes(endPiece) || endPiece === '')) {
                if (isBlock(startRow, startCol, endRow, endCol)) {
                    return false;
                }
                return Math.abs(startRow - endRow) === Math.abs(startCol - endCol);
            }
            if (startPiece === '♕' && (black.includes(endPiece) || endPiece === '')) {
                if (isBlock(startRow, startCol, endRow, endCol)) {
                    return false;
                }
                return Math.abs(startRow - endRow) === Math.abs(startCol - endCol) || startRow === endRow || startCol === endCol;
            }
            if (startPiece === '♔' && (black.includes(endPiece) || endPiece === '')) {
                return (Math.abs(startRow - endRow) === 1 && Math.abs(startCol - endCol) === 1)
                    || (Math.abs(startRow - endRow) === 0 && Math.abs(startCol - endCol) === 1)
                    || (Math.abs(startRow - endRow) === 1 && Math.abs(startCol - endCol) === 0)
            }
        }

        if (playerColor === 'black') {
            if (startPiece.toLowerCase() === '♟') {
                if (startCol === endCol) {
                    if (endPiece === '' && ((startRow === 1 && endRow - startRow <= 2) || endRow - startRow === 1)) {
                        return true;
                    } else {
                        return false;
                    }
                }

                if (Math.abs(startCol - endCol) === 1) {
                    if (Math.abs(startRow - endRow) === 1 && white.includes(endPiece)) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
            if (startPiece === '♞' && (white.includes(endPiece) || endPiece === '')) {
                const dx = Math.abs(startCol - endCol);
                const dy = Math.abs(startRow - endRow);
                return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
            }
            if (startPiece === '♜' && (white.includes(endPiece) || endPiece === '')) {
                if (isBlock(startRow, startCol, endRow, endCol)) {
                    return false;
                }
                return (startRow === endRow || startCol === endCol);
            }
            if (startPiece === '♝' && (white.includes(endPiece) || endPiece === '')) {
                if (isBlock(startRow, startCol, endRow, endCol)) {
                    return false;
                }
                return Math.abs(startRow - endRow) === Math.abs(startCol - endCol);
            }
            if (startPiece === '♛' && (white.includes(endPiece) || endPiece === '')) {
                if (isBlock(startRow, startCol, endRow, endCol)) {
                    return false;
                }
                return Math.abs(startRow - endRow) === Math.abs(startCol - endCol) || startRow === endRow || startCol === endCol;
            }
            if (startPiece === '♚' && (white.includes(endPiece) || endPiece === '')) {
                return (Math.abs(startRow - endRow) === 1 && Math.abs(startCol - endCol) === 1)
                    || (Math.abs(startRow - endRow) === 0 && Math.abs(startCol - endCol) === 1)
                    || (Math.abs(startRow - endRow) === 1 && Math.abs(startCol - endCol) === 0)
            }
        }

        return false;
    }

    function isBlock(startRow, startCol, endRow, endCol) {
        // Go horizontal
        if (startRow === endRow) {
            for (let i = 1; i < Math.abs(startCol - endCol); i++) {
                piece = squares[startRow][startCol > endCol ? startCol - i : startCol + i].innerText;
                if (black.includes(piece) || white.includes(piece)) {
                    return true;
                }
            }
            return false;
        }

        // Go vertical
        if (startCol === endCol) {
            for (let i = 1; i < Math.abs(startRow - endRow); i++) {
                piece = squares[startRow > endRow ? startRow - i : startRow + i][startCol].innerText;
                console.log(piece);
                if (black.includes(piece) || white.includes(piece)) {
                    return true;
                }
            }
            return false;
        }

        // Go cross
        for (let i = 1; i < Math.abs(startRow - endRow); i++) {
            piece = squares
            [startRow > endRow ? startRow - i : startRow + i]
            [startCol > endCol ? startCol - i : startCol + i]
                .innerText;
            if (black.includes(piece) || white.includes(piece)) {
                return true;
            }
        }
        return false;
    }

    function isHightLight(hightLight) {
        if (!myturn.getValue()) {
            return;
        }

        for (let i = 0; i < squares.length; i++) {
            for (let j = 0; j < squares[i].length; j++) {
                const square = squares[i][j];
                if (square.innerText && hightLight) {
                    if (playerColor === 'white') {
                        white.includes(square.innerText.toLowerCase())
                            ? square.classList.add('hight-light')
                            : square.classList.remove('hight-light');
                    }
                    if (playerColor === 'black') {
                        black.includes(square.innerText.toLowerCase())
                            ? square.classList.add('hight-light')
                            : square.classList.remove('hight-light');
                    }
                } else {
                    square.classList.remove('hight-light');
                }
            }
        }
    }
})

// Helper
// _________________________________________________________________________________

function createObservable(initialValue, onChange, initCall = false) {
    let value = initialValue;
    if (initCall) {
        onChange(initialValue, null);
    }

    function setValue(newValue) {
        if (newValue !== value) {
            onChange(newValue, value);
            value = newValue;
        }
    }

    function getValue() {
        return value;
    }

    return {
        setValue,
        getValue
    };
}