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
let rooms = {
  12345: { sockets: ['socket1', 'socket2'] },
  69696: { sockets: ['socket3'] },
  98765: { sockets: ['socket4', 'socket5'] }
};

io.on('connection', (socket) => {
  socket.on('createRoom', () => {
    let randomId;
    do {
      randomId = Math.floor(Math.random() * 10000) + 1;
    } while (rooms[randomId]);

    socket.join(randomId.toString());
    rooms[randomId] = { sockets: [socket.id] };
    socket.emit('enterRoom', [randomId, rooms[randomId]])
  });

  socket.on('joinRoom', (id) => {
    socket.join(id.toString());
    if(rooms[randomId].sockets.length < 2) {
      rooms[randomId] = { sockets: [...rooms[randomId].sockets, socket.id] };
      socket.emit('enterRoom', [randomId, rooms[randomId]])
    }else {
      socket.emit('roomFull', 'This room is full!');
    }
  })

  socket.emit('rooms', rooms);

  socket.on('getRoom', () => {
    socket.emit('rooms', rooms);
  })

  socket.on('disconnecting', () => {
    const roomsToLeave = Object.keys(socket.rooms).filter(item => item !== socket.id);
    roomsToLeave.forEach(room => {
      if (rooms[room]) {
        const index = rooms[room].sockets.indexOf(socket.id);
        if (index !== -1) {
          rooms[room].sockets.splice(index, 1);
          if (rooms[room].sockets.length === 0) {
            delete rooms[room];
          }
        }
      }
    });
  });

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

