import fetchNews from './helpers/fetch-news.js';
import embed from './helpers/embedding.js';
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = "news_articles";

export async function ingest() {
  const newsItems = await fetchNews();

  let points = [];


  for (const item of newsItems) {
    const text = item.title + ": " + item.content;
    const vector = await embed(text);
    
    const point = {
      id: uuidv4(),
      vector: vector,
      payload: item, 
    };
    points.push(point);
    process.stdout.write("."); 
  }

  try {
      try {
      await qdrant.deleteCollection(COLLECTION_NAME);
    } catch (e) {
      console.log("   No existing collection to delete.");
    }

        await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: 768, distance: "Cosine" },
    });

        await qdrant.upsert(COLLECTION_NAME, { points: points });
    
    console.log("🎉 Success! Database updated with fresh data.");
    process.exit(0);
    
  } catch (error) {
    console.log("❌ Error ingesting data:", error);
    process.exit(1); 
  }
}

ingest();


await qdrant.deleteCollection(COLLECTION_NAME);