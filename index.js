import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import connectDataBase from "./src/middlewares/connectDataBase.js";
import globalError from "./src/middlewares/errorHandlers.js";
import userRoutes from "./src/routes/userRoutes.js";
import cookieParser from "cookie-parser";
import chatRoutes from "./src/routes/chatRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";
import { app, server } from "./src/socketio/socketServer.js";

dotenv.config();

// set cors
// app.use(cors());
cors({
  origin: ["http://localhost:7000", "https://chat-app-toyj.onrender.com"],
});
// body paser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// cookie parser middleware
app.use(cookieParser());

const port = 7000;

// handle uncaught exception error
process.on("uncaughtException", (err) => {
  console.log(
    `Uncaught Exception Error \nerror name: ${err.name} \n error message: ${err.message}`
  );
  process.exit(1);
});

// connect database
connectDataBase();

app.use(userRoutes);
app.use(chatRoutes);
app.use(messageRoutes);

// upload image routes
const __dirname = path.resolve();
app.use(`/uploads`, express.static(path.join(__dirname, "/uploads"))); // serve image route

// test endpoint
app.get("/test", (req, res) => {
  console.log("testing test endpoint test");
  res.status(200).json({ message: "test endpoint healthy" });
});

// handle global error
app.use(globalError);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`.blue);
});

// handle unhandled rejection error
process.on("unhandledRejection", (err) => {
  console.log(
    `Unhandled Rejection Error \nerror name: ${err.name} \n error message: ${err.message}`
  );
  server.close(() => {
    process.exit(1);
  });
});
