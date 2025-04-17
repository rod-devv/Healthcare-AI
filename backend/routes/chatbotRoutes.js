import express from "express";

import {
  sendChat,
  summarizeConversation,
  getChatHistory,
} from "../controllers/chatbotController.js";
// const authMiddleware = require("../middleware/auth");
import authUser from "../middleware/authUser.js";

const router = express.Router();

// Protect the routes with authentication (and optionally role-based access)
// Example: only authenticated users (admin, doctor, user) can access the chatbot.
router.post("/chat", authUser, sendChat);
router.post("/summarize", authUser, summarizeConversation);

router.get("/history", authUser, getChatHistory);
export default router;
