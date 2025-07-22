//server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

const rooms = new Map(); 

io.on('connection', (socket) => {
  socket.on('join', ({ roomId, username }) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: new Set(), callerId: socket.id });
  }
  const room = rooms.get(roomId); 
  if (room.users.size >= 2) {
    socket.emit('room-full');
    return;
  }
  const callerId = room.callerId;   // Store the caller's socket ID for easy reference
  if (socket.id === callerId) {
    room.users.add(socket.id);
    socket.join(roomId);    //Socket.IO added you to a specific group of sockets //	Adds socket to a Socket.IO broadcast room
    socket.data.roomId = roomId;
    io.to(roomId).emit('user-joined', username);  //Inform everyone in the room that this username has joined.

    socket.emit('room-joined', { callerId });
  } else {
   room.users.add(socket.id);
socket.join(roomId);
socket.data.roomId = roomId;
socket.emit('room-joined', { callerId });
io.to(roomId).emit('user-joined', username);
  }
});


  socket.on('join-response', ({ requestorId, accepted }) => {
  const requestSocket = io.sockets.sockets.get(requestorId);
  if (!requestSocket || !requestSocket.data.pendingJoin) return;

  const { roomId, username } = requestSocket.data.pendingJoin;
  const room = rooms.get(roomId);                       //Retrieve the current room's data
  if (!room || socket.id !== room.callerId) return;

  if (accepted) {
    room.users.add(requestorId);  //Add the callee’s socket.id to the users Set for that room.
    requestSocket.join(roomId); //Add the callee’s socket to the Socket.IO room.Now they’ll receive events emitted to io.to(roomId).
    requestSocket.data.roomId = roomId; //Store the room ID in the callee's socket.data
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
      room.users.delete(socket.id);   //Removes the user from your custom room data
      socket.leave(roomId);           //Removes the user from Socket.IO’s internal room system
      rooms.delete(roomId);           //Deletes the entire room from your custom rooms Map
      socket.emit('left-call');
    } else {
      socket.emit('cannot-leave', 'Callee is still in the call. As a caller, you cannot leave.');
    }
  } else {
    room.users.delete(socket.id);
    socket.leave(roomId);
    socket.emit('left-call');
    socket.to(roomId).emit('peer-left');
    // If only caller remains after this, keep room alive
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

      if (room.users.size === 0) {
        rooms.delete(roomId);
      } else {
        socket.to(roomId).emit('peer-left');
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
