import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config"; 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export default async function embed(text) {
    try {
        const result = await model.embedContent({
            content: { parts: [{ text: text }] },
            outputDimensionality: 768,
          });
        const vector = result.embedding.values
        return vector
    } catch (error) {
        console.log("Error generating embedding:", error);
        return null
    }
}