import {
  redis,
  qdrant,
  chatModel,
  fallbackModel,
  COLLECTION_NAME,
} from "../config/client.js";
import embed from "../helpers/embedding.js";

/**
 * Helper: Retries with exponential backoff and fails over to a secondary model
 * if the primary model is hitting 503 (High Demand) or 429 (Rate Limit).
 */
const generateWithFallback = async (prompt) => {
  const models = [chatModel, fallbackModel];

  for (const model of models) {
    let delay = 1000;
    for (let i = 0; i < 2; i++) { // 2 attempts per model
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        const statusCode = error.status || 0;
        const isRetryable = statusCode === 503 || statusCode === 429 || error.message?.includes("503");

        if (isRetryable && i < 1) {
          // Add jitter to delay: delay * (0.5 to 1.5)
          const jitter = delay * (Math.random() + 0.5);
          await new Promise((res) => setTimeout(res, jitter));
          delay *= 2;
          continue;
        }
        // If not retryable or max retries hit for this model, move to next model
        break; 
      }
    }
  }
  throw new Error("All AI models are currently unavailable.");
};

export const handleChat = async (req, res) => {
  const { message, sessionId } = req.body;
  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!message || !sessionId) {
    return res.status(400).json({ error: "Missing message or sessionId" });
  }

  const historyKey = `chat:${sessionId}`;

  try {
    // 1. Parallel execution for Vector Search and History Retrieval
    const vector = await embed(message);
    const [rawHistory, searchResults] = await Promise.all([
      redis.lrange(historyKey, 0, -1),
      qdrant.search(COLLECTION_NAME, { vector: vector, limit: 3 }),
    ]);

    // 2. Safe parsing of history to prevent syntax crashes
    const history = rawHistory
      .map((item) => {
        try {
          return typeof item === "string" ? JSON.parse(item) : item;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    // 3. Build Context String
    const contextText = searchResults
      .map((item) => `Source: ${item.payload.title || "News"}\nContent: ${item.payload.content}`)
      .join("\n\n");

    const prompt = `
      You are a helpful news assistant. Use the following context to answer.
      CONTEXT: ${contextText}
      CHAT HISTORY: ${history.map((m) => `${m.role}: ${m.content}`).join("\n")}
      USER QUESTION: ${message}
    `;

    // 4. Generate response with fallback logic
    const botReply = await generateWithFallback(prompt);

    // 5. Atomic push: Save both user and bot messages only if AI succeeds
    const userMsg = JSON.stringify({ role: "user", content: message, time: currentTime });
    const botMsg = JSON.stringify({ role: "assistant", content: botReply, time: currentTime });

    await redis.rpush(historyKey, userMsg, botMsg);
    await redis.expire(historyKey, 86400); // 24-hour TTL

    res.json({ reply: botReply });
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(503).json({ 
      error: "The AI service is currently experiencing high demand. Please try again in a few seconds." 
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const historyKey = `chat:${sessionId}`;

    const rawHistory = await redis.lrange(historyKey, 0, -1);

    const history = rawHistory
      .map((item) => {
        try {
          return typeof item === "string" ? JSON.parse(item) : item;
        } catch (e) {
          console.error("⚠️ Failed to parse history item:", e.message);
          return null;
        }
      })
      .filter((i) => i !== null);

    res.json(history);
  } catch (error) {
    console.error("History Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};