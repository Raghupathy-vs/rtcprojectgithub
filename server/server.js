const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

const rooms = new Map(); 

const { router: apiRoutes, setRoomsMap } = require('./api');
setRoomsMap(rooms);
app.use('/api', apiRoutes);

io.on('connection', (socket) => {
  socket.on('join', ({ roomId, username }) => {
    if (!roomId || !username) {
      socket.emit('error-message', 'Room ID and Username required');
      return;
    }

    const room = rooms.get(roomId);

    if (room) {
      if (room.users.size >= 2) {
        socket.emit('room-full');
        return;
      }

      const callerId = room.callerId;
      room.users.add(socket.id);
      socket.join(roomId);
      socket.data.roomId = roomId;

      io.to(roomId).emit('user-joined', username);

      socket.emit('room-joined', { callerId });
    } 
    else {
      rooms.set(roomId, { users: new Set([socket.id]), callerId: socket.id });
      socket.join(roomId);
      socket.data.roomId = roomId;

      io.to(roomId).emit('user-joined', username);
      socket.emit('room-joined', { callerId: socket.id });
    }
  });

  socket.on('join-response', ({ requestorId, accepted }) => {
    const requestSocket = io.sockets.sockets.get(requestorId);
    if (!requestSocket || !requestSocket.data.pendingJoin) return;

    const { roomId, username } = requestSocket.data.pendingJoin;
    const room = rooms.get(roomId);
    if (!room || socket.id !== room.callerId) return;

    if (accepted) {
      room.users.add(requestorId);
      requestSocket.join(roomId);
      requestSocket.data.roomId = roomId;
      requestSocket.emit('room-joined', { callerId: room.callerId });
      io.to(roomId).emit('user-joined', username);
    } else {
      requestSocket.emit('join-denied');
    }
  });

  socket.on('ready-for-offer', (roomId) => {
    socket.to(roomId).emit('ready-to-call', roomId);
  });

  socket.on('offer', (data) => {
    socket.to(data.room).emit('offer', data.offer);
  });

  socket.on('answer', (data) => {
    socket.to(data.room).emit('answer', data.answer);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.room).emit('ice-candidate', data.candidate);
  });

  socket.on('negotiate', (roomId) => {
    socket.to(roomId).emit('negotiate');
  });

  socket.on('leave-call', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const isCaller = socket.id === room.callerId;

    if (isCaller) {
      if (room.users.size === 1) {
        rooms.delete(roomId);
        socket.leave(roomId);
        socket.emit('left-call');
      } else {
        socket.emit('cannot-leave', 'Callee is still in the call. As a caller, you cannot leave.');
      }
    } else {
      room.users.delete(socket.id);
      socket.leave(roomId);
      socket.emit('left-call');
      socket.to(roomId).emit('peer-left');
    }

    if (room.users.size === 0) {
      rooms.delete(roomId);
    }
  });

  socket.on('end-call', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);

    if (!room || socket.id !== room.callerId) return;

    for (const id of room.users) {
      io.to(id).emit('call-ended');
    }

    rooms.delete(roomId);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);

    if (room) {
      room.users.delete(socket.id);
      socket.to(roomId).emit('peer-left');

      if (room.users.size === 0) {
        rooms.delete(roomId);
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
