import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config"; 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

export default async function embed(text) {
    try {
        const result = await model.embedContent(text)
        const vector = result.embedding.values
        return vector
    } catch (error) {
        console.log("Error generating embedding:", error);
        return null
    }
}