import express from "express";
import {
  createMessage,
  deleteMessages,
  getTotalUnreadMessages,
  getUserMessages,
  updateMessageStatus,
} from "../controllers/messageController.js";

const router = express.Router();

router.route("/message").post(createMessage).delete(deleteMessages);
router.route("/message/:chatId").get(getUserMessages);
router.route("/message/update-message-status").post(updateMessageStatus);
router
  .route("/message/total-unread-messages/:userId")
  .get(getTotalUnreadMessages);
export default router;
