import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "exp://127.0.0.1:8081",
      "http://localhost:5175",
      "http://172.27.62.117:8081",
      "http://192.168.65.46:8082:",
    ],
    // origin: "*",
    methods: ["POST", "GET"],
  },
});

let usersOnline = [];

const getReceiverSocketId = (receiverId) => {
  const receiver = usersOnline.find((user) => user.userId === receiverId);
  return receiver?.socketId;
};

io.on("connection", (socket) => {
  console.log("socket connected ==> ", socket.id);
  // add new User
  socket.on("addNewUser", (userId) => {
    // if user is not added previously
    if (!usersOnline.some((user) => user.userId === userId)) {
      usersOnline.push({
        userId: userId,
        socketId: socket.id,
      });
      console.log("New User Connected", userId);
      console.log(" Connected users online", usersOnline);
    }

    // send all active users to new user
    io.emit("getUsersOnline", usersOnline);
  });

  socket.on("disconnect", () => {
    // remove user from active users
    usersOnline = usersOnline.filter((user) => user.socketId !== socket.id);
    console.log("User Disconnected", usersOnline);
    // send all active users to all users
    io.emit("getUsersOnline", usersOnline);
  });

  // send message to a specific user
  socket.on("sendMessage", (messageData) => {
    const { receiverId, message } = messageData;
    const user = usersOnline.find((user) => user.userId === receiverId);
    console.log("Sending from socket to :", receiverId);
    console.log("message: ", messageData);
    if (user) {
      io.to(user.socketId).emit("recieveMessage", message);
    }
  });
});

export { app, io, server, getReceiverSocketId };
