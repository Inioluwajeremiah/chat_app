import mongoose from "mongoose";

const MessageSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: [true, "Chat ID is required"],
    },
    text: {
      type: String,
      required: [true, "Text is required"],
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const MessageModel = mongoose.model("Message", MessageSchema);
export default MessageModel;
