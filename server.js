const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

let playerTurn = 1; // Player 1 starts the game
let players = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  // Assign each new player a number and store their socket
  players[socket.id] = { id: socket.id, playerNumber: Object.keys(players).length + 1 };

  // Send the player their assigned number
  socket.emit('playerNumber', players[socket.id].playerNumber);

  socket.on('makeMove', (data) => {
    // Check if it's the player's turn
    if (players[socket.id].playerNumber === playerTurn) {
      // Broadcast the move to the other player
      socket.broadcast.emit('opponentMove', data);
      
      // Switch turns
      playerTurn = playerTurn === 1 ? 2 : 1;
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
  });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
