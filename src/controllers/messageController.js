import tryCatchAsyncMiddleWare from "../middlewares/tryCatchAsyncMiddleWare.js";
import { CustomError } from "../middlewares/CustomError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";
import MessageModel from "../models/MessageModel.js";
import ChatModel from "../models/ChatModel.js";

const createMessage = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { userId, chatId, text, receiverId } = req.body;

  const newmessage = await MessageModel.create({
    userId,
    chatId,
    text,
    receiverId,
  });
  if (newmessage) {
    const updateChat = await ChatModel.findByIdAndUpdate(
      { _id: chatId },
      {
        lastMessage: newmessage._id,
        $inc: { [`unreadCounts.${receiverId}`]: 1 },
      }
    );

    if (updateChat) {
      res.status(STATUS_CODES.HTTP_201_CREATED).json({
        status: "success",
        message: "Message created successfully!",
        data: newmessage,
      });
    } else {
      const deletemessage = await MessageModel.findOneAndDelete(newmessage._id);
      const error = new CustomError(
        "Oops! Unable to create message at this time due failed chat update. Please try again later",
        STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
      );
      return next(error);
    }
  } else {
    const error = new CustomError(
      "Oops! Unable to create message at this time. Please try again later",
      STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
    );
    return next(error);
  }
});

const getUserMessages = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { chatId } = req.params;
  const usermessages = await MessageModel.find({
    chatId: chatId,
  });
  if (usermessages) {
    res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      message: "User messages retrieved successfully!",
      data: usermessages,
    });
  } else {
    const error = new CustomError(
      "Oops! Unable to retrieve messages at this time. Please try again later",
      STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
    );
    return next(error);
  }
});

const getTotalUnreadMessages = tryCatchAsyncMiddleWare(
  async (req, res, next) => {
    const { userId } = req.params;

    try {
      // Query the ChatModel for chats involving the user and their unread counts
      const chats = await ChatModel.find({ users: userId });

      // Sum up the unread counts for the specific user
      let totalUnread = 0;
      chats.forEach((chat) => {
        if (chat.unreadCounts.has(userId.toString())) {
          totalUnread += chat.unreadCounts.get(userId.toString());
        }
      });

      // Send the response with the total unread messages
      res.status(STATUS_CODES.HTTP_200_OK).json({
        status: "success",
        message: "Total unread messages fetched successfully",
        data: totalUnread,
      });
    } catch (error) {
      // Log error and send custom error response
      console.error("Error fetching unread message counts:", error);
      const customError = new CustomError(
        "Unable to fetch unread message counts",
        STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
      );
      return next(customError);
    }
  }
);

const getTotalUnreadMessages2 = tryCatchAsyncMiddleWare(
  async (req, res, next) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      const error = new CustomError(
        "Invalid user ID",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      );
      return next(error);
    }

    const result = await ChatModel.aggregate([
      // Match chats where the user is a participant
      {
        $match: {
          users: userId,
        },
      },
      // Project only the unreadCounts for the given user
      {
        $project: {
          unreadCount: {
            $ifNull: [`$unreadCounts.${userId}`, 0],
          },
        },
      },
      // Sum all unreadCounts
      {
        $group: {
          _id: null,
          totalUnreadMessages: { $sum: "$unreadCounts" },
        },
      },
    ]);

    const totalUnreadMessages =
      result.length > 0 ? result[0].totalUnreadMessages : 0;
    if (result) {
      res.status(STATUS_CODES.HTTP_200_OK).json({
        status: "success",
        message: "Total unread messages fetched successfully",
        data: totalUnreadMessages,
      });
    } else {
      const error = new CustomError(
        "Failed to fetch unread messages",
        STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
      );
      return next(error);
    }
  }
);

const updateMessageStatus2 = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { messageIds, status, userId } = req.body;

  // Validate input
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return next(
      new CustomError(
        "Invalid or empty message IDs array provided.",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      )
    );
  }

  if (!["sent", "delivered", "read"].includes(status)) {
    return next(
      new CustomError(
        "Invalid status value provided.",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      )
    );
  }

  // Find all messages by IDs
  const messages = await MessageModel.find({ _id: { $in: messageIds } });

  if (messages.length === 0) {
    return next(
      new CustomError(
        "No messages found for the provided IDs.",
        STATUS_CODES.HTTP_404_NOT_FOUND
      )
    );
  }

  // Track updates for unread counts
  const chatUpdates = {};

  // Update message statuses and prepare chat updates
  const updates = messages.map((message) => {
    if (message.status === "read" && status === "read") {
      return null; // Skip if already read
    }

    if (status === "read" && message.status !== "read") {
      chatUpdates[message.chatId] = (chatUpdates[message.chatId] || 0) - 1;
    }

    // Update the message status
    return MessageModel.findByIdAndUpdate(
      message._id,
      { status },
      { new: true }
    );
  });

  // Execute all message updates
  await Promise.all(updates);

  // Update unread counts for chats
  const chatUpdatePromises = Object.entries(chatUpdates).map(
    ([chatId, decrement]) =>
      ChatModel.findByIdAndUpdate(
        chatId,
        {
          $inc: { [`unreadCounts.${userId}`]: decrement },
        },
        { new: true }
      )
  );

  await Promise.all(chatUpdatePromises);

  // Respond with success
  res.status(STATUS_CODES.HTTP_200_OK).json({
    status: "success",
    message: "Messages statuses updated successfully.",
  });
});

const updateMessageStatus3 = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { status, userId } = req.body;

  if (!["sent", "delivered", "read"].includes(status)) {
    return next(
      new CustomError(
        "Invalid status value provided.",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      )
    );
  }
  const messages = await MessageModel.find({ receiverId: userId });

  if (messages.length === 0) {
    return next(
      new CustomError(
        "No messages found for the provided IDs.",
        STATUS_CODES.HTTP_404_NOT_FOUND
      )
    );
  }

  // Track updates for unread counts
  const chatUpdates = {};

  // Update message statuses and prepare chat updates
  const updates = messages.map((message) => {
    // If the message belongs to the sender (userId matches the message userId), do nothing
    if (message.userId.toString() === userId.toString()) {
      res.status(STATUS_CODES.HTTP_200_OK).json({
        status: "success",
        message:
          "Messages status cannot be updated by user because user is the sender",
      });

      // return null; // Skip updating status for sender's messages
    }

    if (message.status === "read" && status === "read") {
      res.status(STATUS_CODES.HTTP_200_OK).json({
        status: "success",
        message:
          "Messages status cannot be updated by message is already read by you",
      });
      // return null; // Skip if already read
    }

    if (status === "read" && message.status !== "read") {
      chatUpdates[message.chatId] = (chatUpdates[message.chatId] || 0) - 1;
    }

    // Update the message status if the user is authorized
    return MessageModel.findByIdAndUpdate(
      message._id,
      { status },
      { new: true }
    );
  });

  // Execute all message updates
  await Promise.all(updates);

  // Update unread counts for chats
  const chatUpdatePromises = Object.entries(chatUpdates).map(
    ([chatId, decrement]) =>
      ChatModel.findByIdAndUpdate(
        chatId,
        {
          $inc: { [`unreadCounts.${userId}`]: decrement },
        },
        { new: true }
      )
  );

  await Promise.all(chatUpdatePromises);

  // Respond with success
  res.status(STATUS_CODES.HTTP_200_OK).json({
    status: "success",
    message: "Messages statuses updated successfully.",
  });
});

const updateMessageStatus4 = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { status, userId } = req.body;

  // Validate status
  if (!["sent", "delivered", "read"].includes(status)) {
    return next(
      new CustomError(
        "Invalid status value provided.",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      )
    );
  }

  // Fetch messages for the user
  const messages = await MessageModel.find({ receiverId: userId });
  if (messages.length === 0) {
    return next(
      new CustomError(
        "No messages found for the provided user ID.",
        STATUS_CODES.HTTP_404_NOT_FOUND
      )
    );
  }

  // Prepare bulk updates
  const chatUpdates = {};
  const bulkUpdates = messages.reduce((acc, message) => {
    if (message.userId.toString() === userId.toString()) return acc;
    if (message.status === "read" && status === "read") return acc;

    // Track chat updates
    if (status === "read" && message.status !== "read") {
      chatUpdates[message.chatId] = (chatUpdates[message.chatId] || 0) - 1;
    }

    acc.push({
      updateOne: {
        filter: { _id: message._id },
        update: { status },
      },
    });
    return acc;
  }, []);

  // Execute bulk message updates
  if (bulkUpdates.length > 0) {
    await MessageModel.bulkWrite(bulkUpdates);
  }

  // Update unread counts in chats
  const chatUpdatePromises = Object.entries(chatUpdates).map(
    ([chatId, decrement]) =>
      ChatModel.findByIdAndUpdate(
        chatId,
        { $inc: { [`unreadCounts.${userId}`]: decrement } },
        { new: true }
      )
  );
  await Promise.all(chatUpdatePromises);

  // Respond with success
  res.status(STATUS_CODES.HTTP_200_OK).json({
    status: "success",
    message: "Messages statuses updated successfully.",
  });
});

const updateMessageStatus = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { status, userId } = req.body;

  // Validate status
  if (!["sent", "delivered", "read"].includes(status)) {
    return next(
      new CustomError(
        "Invalid status value provided.",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      )
    );
  }

  // Fetch messages for the user
  const messages = await MessageModel.find({ receiverId: userId });
  if (messages.length === 0) {
    return next(
      new CustomError(
        "No messages found for the provided user ID.",
        STATUS_CODES.HTTP_404_NOT_FOUND
      )
    );
  }

  // Prepare bulk updates and unread count tracking
  const chatUpdates = {};
  const bulkUpdates = messages.reduce((acc, message) => {
    if (message.userId.toString() === userId.toString()) return acc; // Skip sender's messages
    if (message.status === "read" && status === "read") return acc; // Skip already-read messages

    // Track unread counts
    if (status === "read" && message.status !== "read") {
      chatUpdates[message.chatId] = (chatUpdates[message.chatId] || 0) - 1;
    }

    acc.push({
      updateOne: {
        filter: { _id: message._id },
        update: { status },
      },
    });
    return acc;
  }, []);

  // Execute bulk message updates
  if (bulkUpdates.length > 0) {
    await MessageModel.bulkWrite(bulkUpdates);
  }

  // Retrieve current unread counts for validation
  const chatData = await ChatModel.find({
    _id: { $in: Object.keys(chatUpdates) },
  });

  chatData.forEach((chat) => {
    chatUpdates[chat._id] = Math.max(
      (chatUpdates[chat._id] || 0) + chat.unreadCounts[userId] || 0,
      0
    );
  });

  // Update unread counts in chats
  const chatUpdatePromises = Object.entries(chatUpdates).map(
    ([chatId, decrement]) =>
      ChatModel.findByIdAndUpdate(
        chatId,
        {
          $inc: { [`unreadCounts.${userId}`]: decrement },
        },
        { new: true }
      )
  );

  await Promise.all(chatUpdatePromises);

  // Respond with success
  res.status(STATUS_CODES.HTTP_200_OK).json({
    status: "success",
    message: "Messages statuses updated successfully.",
  });
});

const deleteMessage = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { messageId } = req.params;
  const deletemessage = await MessageModel.findOneAndDelete({
    messageId,
  });
  if (deletemessage) {
    res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      message: "User message deleted successfully",
    });
  } else {
    const error = new CustomError(
      "Oops! Unable to delete message at this time. Please try again later",
      STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
    );
    return next(error);
  }
});

const deleteMessages = tryCatchAsyncMiddleWare(async (req, res, next) => {
  const { userId, messageIds } = req.body;

  // Validate input
  if (!userId || !messageIds || messageIds.length === 0) {
    return next(
      new CustomError(
        "User ID and message IDs are required",
        STATUS_CODES.HTTP_400_BAD_REQUEST
      )
    );
  }

  const result = await MessageModel.deleteMany({
    _id: { $in: messageIds },
    userId: userId,
  });

  // If no messages were deleted, return an error
  if (result.deletedCount === 0) {
    return next(
      new CustomError(
        "No messages found for the user to delete",
        STATUS_CODES.HTTP_404_NOT_FOUND
      )
    );
  }

  if (result) {
    return res.status(STATUS_CODES.HTTP_200_OK).json({
      status: "success",
      message: `${result.deletedCount} message(s) deleted successfully`,
    });
  } else {
    return next(
      new CustomError(
        "An error occurred while deleting messages",
        STATUS_CODES.HTTP_500_INTERNAL_SERVER_ERROR
      )
    );
  }
});

export {
  createMessage,
  getUserMessages,
  deleteMessage,
  deleteMessages,
  updateMessageStatus,
  getTotalUnreadMessages,
};
