document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    /**Home */
    socket.on('rooms', (rooms) => {
        const roomsElm = document.getElementById('rooms');
        rooms.forEach(room => {
            console.log(room);
        })
    })

    /**Game */
    const board = document.getElementById('board');
    const squares = [];
    let playerColor = null; // 'white' or 'black'
    let selectedSquare = null;
    const black = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜', '♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'];
    const white = ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙', '♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'];
    let deadChess = [];
    let oponentDeadChess = [];
    let game = false;
    let draggedItem = null;
    document.getElementById('playAgain').addEventListener('click', () => {
        socket.emit('playAgain');
    })

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
        chessIntoSquare(squares[endRow][endCol], squares[startRow][startCol].innerText);
        squares[startRow][startCol].innerHTML = '';
    });

    socket.on('newTurn', (data) => {
        const { startRow, startCol, endRow, endCol } = data;
        myturn.setValue(true);
        lastMove.setValue([endRow, endCol])
        isHightLight(true);
    })

    socket.on('deadChess', (chess) => {
        oponentDeadChess.push(chess);
        showDeadChess();
    })

    socket.on('start', () => {
        game = true;
        if (playerColor === 'white') {
            myturn.setValue(true);
        }
        initializeBoard();
        isHightLight(true);
    })

    socket.on('restart', () => {
        game = true;
        selectedSquare = null;
        const btnPlayAgain = document.getElementById('playAgain');
        if (!btnPlayAgain?.classList?.contains('hidden')) {
            btnPlayAgain.classList.add('hidden')
        }
        lastMove.setValue([]);
        deadChess = [];
        oponentDeadChess = [];
        showDeadChess();
        if (playerColor === 'white') {
            myturn.setValue(1);
        } else {
            myturn.setValue(false);
        }
        initializeBoard();
        isHightLight(true);
    })

    socket.on('chatMessage', (message) => {
        displayMessage(message);
    })

    socket.on('winner', (winner) => {
        const turn = document.getElementById('turn');
        turn.innerText = `The player ${winner.toUpperCase()} is the winner. Game over!`;
        document.getElementById('playAgain').classList.remove('hidden');
    })

    function initializeBoard() {
        board.textContent = '';
        for (let i = 0; i < 8; i++) {
            squares[i] = [];
            for (let j = 0; j < 8; j++) {
                const square = document.createElement('div');
                square.className = ((i + j) % 2 === 0) ? 'square white' : 'square black';
                square.classList.add('droppable');
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
                chessIntoSquare(squares[i][j], startingPositions[i][j]);
            }
        }

        setupDragDrop();
    }

    function squareClick(event) {
        if (game === false) {
            return;
        }

        if (myturn.getValue() === false) {
            return;
        }

        const clickedSquare = event.currentTarget;
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
            stackDeadChess(squares[endRow][endCol].innerText);
            chessIntoSquare(squares[endRow][endCol], squares[startRow][startCol].innerText);
            squares[startRow][startCol].innerHTML = '';
            isHightLight(false);
            if (game) { myturn.setValue(false); }
            lastMove.setValue([endRow, endCol]);
            socket.emit('makeMove', { startRow, startCol, endRow, endCol });
        }
    }

    function stackDeadChess(chess) {
        if (!chess) {
            return;
        }
        deadChess.push(chess);
        socket.emit('deadChess', chess);
        showDeadChess();
    }

    function checkWin(endRow, endCol) {
        const endPiece = squares[endRow][endCol].innerText;
        if (endPiece.toLowerCase() === '♔') {
            game = false;
            socket.emit('winner', 'black');
            return true;
        }
        if (endPiece.toLowerCase() === '♚') {
            game = false;
            socket.emit('winner', 'white');
            return true;
        }
        return false;
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

    document.getElementById('messageInput').addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const message = document.getElementById('messageInput').value;
        if (message.trim() !== '') {
            document.getElementById('messageInput').value = '';
            socket.emit('chatMessage', message);
        }
    }

    // Hàm hiển thị tin nhắn trong chatbox
    function displayMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const newMessage = document.createElement('p');
        newMessage.textContent = message;
        chatMessages.appendChild(newMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Cuộn xuống tin nhắn mới nhất
        playMessageSound();
    }

    function playMessageSound() {
        var mp3Source = `<source src="assets/message-sound.mp3" type="audio/mpeg">`;
        document.getElementById("sound").innerHTML = `<audio autoplay="autoplay"> ${mp3Source} </audio>`;
    }

    function showDeadChess() {
        if (playerColor === 'white') {
            document.getElementsByClassName('black-eaten')[0].innerText = deadChess.join(" ");
            document.getElementsByClassName('white-eaten')[0].innerText = oponentDeadChess.join(" ");
        }

        if (playerColor === 'black') {
            document.getElementsByClassName('white-eaten')[0].innerText = deadChess.join(" ");
            document.getElementsByClassName('black-eaten')[0].innerText = oponentDeadChess.join(" ");
        }
    }

    function chessIntoSquare(square, chess) {
        square.innerHTML = '';
        if (!black.includes(chess) && !white.includes(chess)) {
            return;
        }
        const chessElm = document.createElement('span');
        chessElm.className = 'unselectable draggable fill';
        chessElm.setAttribute('draggable', 'true');
        const value = document.createTextNode(chess);
        chessElm.appendChild(value);
        addDragToChess(chessElm);
        square.appendChild(chessElm);
    }

    /**Drag drop */
    function setupDragDrop() {
        const draggables = document.querySelectorAll('.draggable');
        const droppables = document.querySelectorAll('.droppable');

        draggables.forEach(draggable => {
            addDragToChess(draggable)
        });

        droppables.forEach(droppable => {
            droppable.addEventListener('dragover', function (event) {
                event.preventDefault();
            });

            droppable.addEventListener('dragenter', function (event) {
                event.preventDefault();
                // this.classList.add('hovered');
            });

            droppable.addEventListener('dragleave', function () {
                // this.classList.remove('hovered');
            });

            droppable.addEventListener('drop', function () {
                if (draggedItem && selectedSquare) {
                    // this.classList.remove('hovered');
                    const selectedRow = parseInt(selectedSquare.dataset.row);
                    const selectedCol = parseInt(selectedSquare.dataset.col);
                    const row = parseInt(droppable.dataset.row);
                    const col = parseInt(droppable.dataset.col);

                    movePiece(selectedRow, selectedCol, row, col);
                }
            });
        });
    }

    function addDragToChess(chess) {
        chess.addEventListener('dragstart', function (event) {
            if (game === false) {
                return;
            }
            draggedItem = this;
            selectedSquare = event.target.parentNode;
            // this.classList.add('dragging');
        });

        chess.addEventListener('dragend', function () {
            draggedItem = null;
            selectedSquare = null;
            // this.classList.remove('dragging');
        });

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