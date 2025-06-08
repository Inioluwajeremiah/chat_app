import { CustomError } from "../middlewares/CustomError.js";
import tryCatchAsyncMiddleWare from "../middlewares/tryCatchAsyncMiddleWare.js";
import ChatModel from "../models/ChatModel.js";
import MessageModel from "../models/MessageModel.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

const createChat = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { users } = req.body; // users is user ids

  // Validation
  if (!users || !Array.isArray(users) || users.length < 2) {
    const error = new CustomError(
      "Invalid data. A chat requires at least two users.",
      STATUS_CODES.HTTP_400_BAD_REQUEST
    );
    return next(error);
  }

  // Check if a chat already exists with the same users
  const existingChat = await ChatModel.findOne({
    users: { $all: users, $size: users.length },
  });

  if (existingChat) {
    return res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      message: "Chat already exists.",
      data: existingChat,
    });
  }

  // create a new chat
  const newchat = await ChatModel.create({
    users,
    unreadCounts: users.reduce((acc, userId) => {
      acc[userId] = 0;
      return acc;
    }, {}),
    lastMessage: null,
  });

  if (newchat) {
    res.status(STATUS_CODES.HTTP_201_CREATED).json({
      status: "success",
      message: "Chat created successfully!",
      data: newchat,
    });
  } else {
    const error = new CustomError(
      "Oops! Unable to create chat at this time. Please try again later",
      STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
    );
    return next(error);
  }
});

const getUserChats = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { userId } = req.params;
  const userchats = await ChatModel.find({
    users: { $in: [userId] },
    deletedBy: { $ne: userId },
  })
    .populate("lastMessage")
    .populate({
      path: "users",
      select: "-password", // exclude password field
    })
    .lean();
  // Add lastMessage and unreadCount to each chat
  const chatsWithDetails = userchats.map((chat) => {
    const unreadCount = chat.unreadCounts?.[userId] || 0;
    return {
      ...chat,
      lastMessage: chat.lastMessage || null,
      unreadCount,
    };
  });
  if (userchats) {
    res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      message: "User chats retrieved successfully!",
      data: chatsWithDetails,
    });
  } else {
    const error = new CustomError(
      "Oops! Unable to retrieve chat(s) at this time. Please try again later",
      STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
    );
    return next(error);
  }
});

const getUserChat = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { userId, user2Id } = req.params;
  const userchat = await ChatModel.findOne({
    users: { $all: [userId, user2Id] },
    deletedBy: { $ne: userId },
  });
  if (userchat) {
    res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      message: "User chat fetched successfully",
      data: userchat,
    });
  } else {
    const error = new CustomError(
      "Oops! Unable to retrieve chat at this time. Please try again later",
      STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
    );
    return next(error);
  }
});

const deleteChat = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { chatId, userId } = req.body;

  try {
    // Find the chat to ensure it exists
    const chat = await ChatModel.findById(chatId);

    if (!chat) {
      return next(
        new CustomError("Chat not found", STATUS_CODES.HTTP_404_NOT_FOUND)
      );
    }

    // Check if the user is part of the chat
    if (!chat.users.includes(userId)) {
      return next(
        new CustomError(
          "Unauthorized. You cannot delete a chat you're not part of.",
          STATUS_CODES.HTTP_403_FORBIDDEN
        )
      );
    }

    // Soft delete: Add userId to `deletedBy` field
    if (!chat.deletedBy) chat.deletedBy = [];
    if (!chat.deletedBy.includes(userId)) {
      chat.deletedBy.push(userId);
      await chat.save();
    }

    // If both users have marked the chat as deleted, clean up the database
    if (chat.deletedBy.length === chat.users.length) {
      // Delete all messages associated with the chat
      await MessageModel.deleteMany({ chatId: chat._id });

      // Delete the chat itself
      await ChatModel.findByIdAndDelete(chat._id);

      return res.status(STATUS_CODES.HTTP_200_OK).json({
        status: "success",
        message: "Chat and associated messages deleted successfully.",
      });
    }

    // If not both users have deleted, respond with a success for soft delete
    return res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      message: "Chat deleted successfully for the user.",
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return next(
      new CustomError(
        "Failed to delete chat. Please try again later.",
        STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
      )
    );
  }
});

const deleteMultipleChats = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { chatIds, userId } = req.body;

  if (!Array.isArray(chatIds) || chatIds.length === 0) {
    return next(
      new CustomError(
        "Invalid input. Provide an array of chat IDs.",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      )
    );
  }

  try {
    const results = [];

    for (const chatId of chatIds) {
      const chat = await ChatModel.findById(chatId);

      if (!chat) {
        results.push({ chatId, status: "not found" });
        continue;
      }

      if (!chat.users.includes(userId)) {
        results.push({ chatId, status: "unauthorized" });
        continue;
      }

      if (!chat.deletedBy) chat.deletedBy = [];
      if (!chat.deletedBy.includes(userId)) {
        chat.deletedBy.push(userId);
        await chat.save();
      }

      // If both users have marked the chat as deleted, delete the chat and messages
      if (chat.deletedBy.length === chat.users.length) {
        await MessageModel.deleteMany({ chatId: chat._id });
        await ChatModel.findByIdAndDelete(chat._id);
        results.push({ chatId, status: "deleted" });
      } else {
        results.push({ chatId, status: "soft deleted" });
      }
    }

    return res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      results,
    });
  } catch (error) {
    console.error("Error deleting multiple chats:", error);
    return next(
      new CustomError(
        "Failed to delete chats. Please try again later.",
        STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
      )
    );
  }
});

export {
  createChat,
  getUserChat,
  getUserChats,
  deleteChat,
  deleteMultipleChats,
};
