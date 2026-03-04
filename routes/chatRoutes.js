import express from "express";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../config/client.js"; // Reuse your existing Redis client
import { getChatHistory, handleChat } from "../controllers/chatController.js";

const router = express.Router();

// Define the limiter
const chatLimiter = rateLimit({
  // Use Redis to track request counts across server restarts
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // Limit each IP to 5 chat requests per minute
  handler: (req, res) => {
    res.status(429).json({
      error: "⚠️ You're sending messages too fast. Please wait a moment.",
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply limiter ONLY to the POST route
router.post("/chat", chatLimiter, handleChat);

// History remains accessible even if rate-limited on chat
router.get("/history/:sessionId", getChatHistory); 

export default router;