import { redis, qdrant, chatModel, COLLECTION_NAME } from "../config/client.js";
import embed from "../helpers/embedding.js";

export const handleChat = async (req, res) => {
  const { message, sessionId } = req.body;
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!message || !sessionId) {
    return res.status(400).json({ error: "Missing message or sessionId" });
  }

  const historyKey = `chat:${sessionId}`;

  try {
 
    const userMsgObj = { role: "user", content: message, time: currentTime };
    await redis.rpush(historyKey, JSON.stringify(userMsgObj));
    await redis.expire(historyKey, 86400);

    const rawHistory = await redis.lrange(historyKey, 0, -1);
    const history = rawHistory.map((item) => {
        try { return JSON.parse(item); } catch (e) { return null; }
    }).filter(i => i !== null);

    const vector = await embed(message);
    const searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: vector,
      limit: 3,
    });

    const contextText = searchResults
      .map((item) => `Title: ${item.payload.title}\nContent: ${item.payload.content}`)
      .join("\n\n");

    const prompt = `
      You are a helpful news assistant. Use the following CONTEXT to answer the user.
      CONTEXT: ${contextText}
      CHAT HISTORY: ${history.map((m) => `${m.role}: ${m.content}`).join("\n")}
      USER QUESTION: ${message}
    `;

    const result = await chatModel.generateContent(prompt);
    const botReply = result.response.text();

    const botMsgObj = { role: "assistant", content: botReply, time: currentTime };
    await redis.rpush(historyKey, JSON.stringify(botMsgObj));

    res.json({ reply: botReply });

  } catch (error) {
    console.error("Controller Error:", error);
    
    const errorMsgObj = { role: "assistant", content: "⚠️ I encountered an error answering that.", time: currentTime };
    await redis.rpush(historyKey, JSON.stringify(errorMsgObj));
    
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const historyKey = `chat:${sessionId}`;
    
    const rawHistory = await redis.lrange(historyKey, 0, -1);
    

    const history = rawHistory.map((item) => {
        try {
            if (typeof item === 'object' && item !== null) {
                return item;
            }
            if (typeof item === 'string') {
                return JSON.parse(item);
            }
            return null;
        } catch (e) {
            console.error("⚠️ Failed to parse item:", item);
            return null; 
        }
    }).filter(i => i !== null);

    res.json(history);

  } catch (error) {
    console.error("History Error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};