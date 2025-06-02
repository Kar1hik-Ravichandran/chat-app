const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let users = {}; // socket.id -> username
let userSockets = {}; // username -> socket.id

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("set-username", (username) => {
    users[socket.id] = username;
    userSockets[username] = socket.id;
    console.log("User set username:", username);
    io.emit("users", Object.values(users));
  });

  socket.on("send-message", ({ to, text }) => {
    const from = users[socket.id];
    const recipientSocketId = userSockets[to];

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receive-message", { from, text });
    }
  });

  socket.on("message-read", ({ from }) => {
    const reader = users[socket.id];
    const senderSocketId = userSockets[from];
    if (senderSocketId) {
      io.to(senderSocketId).emit("message-read-confirmed", {
        to: reader,
      });
    }
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    console.log("User disconnected:", socket.id);
    delete userSockets[username];
    delete users[socket.id];

    if (username) {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      io.emit("last-seen", { user: username, timestamp });
    }

    io.emit("users", Object.values(users));
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
