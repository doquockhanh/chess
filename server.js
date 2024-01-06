const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');

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
  if (color === 'white') {
    colors = ['white', 'black'];
  }
  socket.emit('color', color);

  socket.on('makeMove', (data) => {
    socket.broadcast.emit('opponentMove', data);
    socket.broadcast.emit('newTurn', data)
  });

  if (Object.keys(players).length === 2) {
    io.emit('start');
  }

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    io.emit('chatMessage', message); // Broadcast message to all connected clients
  });

  socket.on('winner', (winner) => {
    io.emit('winner', winner);
  })

  socket.on('playAgain', () => {
    io.emit('restart');
  })

  socket.on('deadChess', (chess) => {
    socket.broadcast.emit('deadChess', chess);
  })
});

const networkInterfaces = os.networkInterfaces();

// Filter and display IPv4 addresses of Wi-Fi adapter
const wifiInterface = networkInterfaces['Wi-Fi'] || networkInterfaces['wlan0'];
if (wifiInterface) {
  const wifiIPv4 = wifiInterface.find(interface => interface.family === 'IPv4');
  if (wifiIPv4) {
    console.log('Wi-Fi IPv4 address:', wifiIPv4.address);
    serverOn(wifiIPv4.address);
  } else {
    console.log('Wi-Fi IPv4 address not found');
  }
} else {
  console.log('Wi-Fi interface not found');
}

function serverOn(host) {
  server.listen(PORT, host, () => {
    console.log(`Server running on port http://${host}:${PORT}`);
  });
}

