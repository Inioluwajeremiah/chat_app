import express from "express";
import {
  createChat,
  deleteChat,
  getUserChat,
  getUserChats,
} from "../controllers/chatController.js";

const router = express.Router();

router.route("/chat").post(createChat).delete(deleteChat);
router.route("/chat/:userId").get(getUserChats);
router.route("/chat/:userId/:user2Id").get(getUserChat);
export default router;
