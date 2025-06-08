import mongoose from "mongoose";

const ChatSchema = mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

ChatSchema.path("users").validate(function (value) {
  return value.length === 2;
}, "A chat must have exactly 2 users.");

const ChatModel = mongoose.model("Chat", ChatSchema);
export default ChatModel;
