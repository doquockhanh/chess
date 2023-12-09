const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

let players = {};
let colors = ['white', 'black'];

io.on('connection', (socket) => {
  console.log('A user connected');

  // Assign each new player a number and store their socket
  players[socket.id] = { id: socket.id, playerNumber: Object.keys(players).length + 1 };

  // Send the player their color
  const color = colors.pop();
  if(color === 'white') {
    colors = ['white', 'black'];
  }
  socket.emit('color', color);

  socket.on('makeMove', (data) => {
    socket.broadcast.emit('opponentMove', data);
    socket.broadcast.emit('newTurn')
  });

  if (Object.keys(players).length === 2) {
    io.emit('start');
  }

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
