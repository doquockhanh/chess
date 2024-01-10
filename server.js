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
let rooms = {};

io.on('connection', (socket) => {
  // Assign each new player a number and store their socket
  players[socket.id] = { id: socket.id, playerNumber: Object.keys(players).length + 1 };

  socket.on('getRoom', () => {
    socket.emit('rooms', rooms);
  })

  socket.on('createRoom', () => {
    let randomId;
    do {
      randomId = (Math.floor(Math.random() * 10000) + 1).toString();
    } while (rooms[randomId]);

    socket.join(randomId);
    rooms[randomId] = { sockets: [socket.id] };
    sendRoomDetail(randomId);
  });

  socket.on('joinRoom', (id) => {
    socket.join(id);
    if (rooms[id].sockets.length < 2) {
      rooms[id] = { sockets: [...rooms[id].sockets, socket.id] };
      sendRoomDetail(id);
    } else {
      socket.emit('roomFull', 'This room is full!');
    }
  })

  function sendRoomDetail(roomid) {
    const room = rooms[roomid];
    const playersDetail = [];
    room.sockets.forEach(socketID => {
      playersDetail.push(players[socketID])
    })
    io.to(roomid).emit('enterRoom', [roomid, playersDetail]);
  }

  socket.on('disconnecting', () => {
    console.log('A user disconnecting');
    removeEmptyRooms();
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
  });

  socket.on('outRoom', () => {
    removeEmptyRooms();
  })

  function removeEmptyRooms() {
    const roomsToLeave = Array.from(socket.rooms);
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
  }

  socket.on('makeMove', (data) => {
    const roomID = getRoomIdBySocket();
    io.to(roomID).emit('opponentMove', data);
    io.to(roomID).emit('newTurn', data)
  });

  socket.on('start', (roomid) => {
    if (rooms[roomid].sockets.length === 2) {
      socket.emit('color');
      io.to(roomid).emit('start');
    }
  })

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const roomID = getRoomIdBySocket();
    io.to(roomID).emit('chatMessage', message); // Broadcast message to all connected clients
  });

  socket.on('winner', (winner) => {
    const roomID = getRoomIdBySocket();
    io.to(roomID).emit('winner', winner);
  })

  socket.on('playAgain', () => {
    const roomId = getRoomIdBySocket();
    if (rooms[roomId].sockets.length === 2) {
      socket.emit('color');
      io.to(roomId).emit('restart');
    }
  })

  socket.on('deadChess', (chess) => {
    const roomID = getRoomIdBySocket();
    io.to(roomID).emit('deadChess', chess);
  })

  function getRoomIdBySocket() {
    const roomsJoined = Array.from(socket.rooms);
    roomsJoined.forEach(roomid => {
      if (rooms[roomid]) {
        return roomid
      }
    });
  }
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

