import { QdrantClient } from "@qdrant/js-client-rest";
import { Redis } from "@upstash/redis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const chatModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
export const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

export const COLLECTION_NAME = "news_articles";