import { redis, qdrant, chatModel, fallbackModel, COLLECTION_NAME } from "../config/client.js";
import embed from "../helpers/embedding.js";

// Helper for retries + fallback
const generateWithFallback = async (prompt) => {
  const models = [chatModel, fallbackModel];
  
  for (const model of models) {
    let delay = 1000;
    for (let i = 0; i < 2; i++) { // 2 retries per model
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        const is503 = error.status === 503 || error.message?.includes("503");
        if (is503 && i < 1) {
          await new Promise(res => setTimeout(res, delay * (Math.random() + 0.5)));
          delay *= 2;
          continue;
        }
        break; // Move to the next model if not a 503 or retries exhausted
      }
    }
  }
  throw new Error("All models are currently unavailable.");
};

export const handleChat = async (req, res) => {
  const { message, sessionId } = req.body;
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!message || !sessionId) return res.status(400).json({ error: "Missing data" });

  const historyKey = `chat:${sessionId}`;

  try {
    // 1. Context & History Retrieval
    const vector = await embed(message);
    const [rawHistory, searchResults] = await Promise.all([
      redis.lrange(historyKey, 0, -1),
      qdrant.search(COLLECTION_NAME, { vector, limit: 3 })
    ]);

    const history = rawHistory.map(item => JSON.parse(item)).filter(Boolean);
    const contextText = searchResults.map(item => item.payload.content).join("\n\n");

    const prompt = `CONTEXT: ${contextText}\nHISTORY: ${history.map(m => m.content).join("\n")}\nUSER: ${message}`;

    // 2. Generate with Fallback
    const botReply = await generateWithFallback(prompt);

    // 3. Save both messages ONLY on success
    const userMsg = JSON.stringify({ role: "user", content: message, time: currentTime });
    const botMsg = JSON.stringify({ role: "assistant", content: botReply, time: currentTime });
    
    await redis.rpush(historyKey, userMsg, botMsg);
    await redis.expire(historyKey, 86400);

    res.json({ reply: botReply });

  } catch (error) {
    console.error("Controller Error:", error);
    res.status(503).json({ error: "AI service is currently busy. Try again in a moment." });
  }
};