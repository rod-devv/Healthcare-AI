// models/Conversation.js
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String }, // Optional title field for the conversation summary
  messages: [
    {
      role: {
        type: String,
        enum: ["system", "user", "assistant"],
        required: true,
      },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const ConversationModel =
  mongoose.models.conversation ||
  mongoose.model("conversation", conversationSchema);
export default ConversationModel;
