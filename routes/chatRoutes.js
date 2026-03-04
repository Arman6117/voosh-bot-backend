import express from "express";
import { getChatHistory, handleChat } from "../controllers/chatController.js";

const router = express.Router();

router.post("/chat", handleChat);
router.get("/history/:sessionId", getChatHistory); 

export default router;