// server/api.js
const express = require('express');
const router = express.Router();

// Exported 'rooms' Map will be injected later from server.js
let roomsRef = null;

// Middleware to inject the rooms Map
router.use((req, res, next) => {
  if (!roomsRef) return res.status(500).json({ error: "Room data not available" });
  next();
});

// GET /api/rooms - List all live rooms with users
router.get('/rooms', (req, res) => {
  const roomList = [];                      // created to store details of all active rooms.

  for (const [roomId, room] of roomsRef.entries()) {
    roomList.push({
      roomId,
      userCount: room.users.size,
      userIds: Array.from(room.users.keys()),
    });
  }

  res.json({ activeRooms: roomList });
});

// Allow server.js to inject 'rooms'
module.exports = {
  router,
  setRoomsMap: (rooms) => roomsRef = rooms
};
