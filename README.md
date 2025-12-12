# **🤖 Voosh News Bot \- Backend API**

The intelligent backend for the Voosh News Chatbot. This API orchestrates the RAG pipeline, manages session memory with Redis, and serves real-time news insights using Google Gemini.

## **🚀 Live API**

**Base URL:** \[INSERT\_YOUR\_RENDER\_URL\_HERE\] (e.g., https://voosh-backend.onrender.com)

## **🏗️ System Architecture (MVC)**

The codebase follows a strict **Model-View-Controller** pattern for scalability and readability:

* **server.js**: Entry point. Handles CORS and server startup.  
* **src/controllers/**: Contains business logic (chatController.js, newsController.js).  
* **src/routes/**: API route definitions.  
* **src/config/**: Centralized configuration for Qdrant, Redis, and Gemini.  
* **scripts/**: Standalone scripts for data ingestion.

## **🧠 System Design & Caching Strategy (Evaluation Criteria)**

### **1\. The RAG Pipeline (Retrieval Augmented Generation)**

To ensure the bot answers with *facts* rather than *hallucinations*, we use a strict RAG flow:

* **Ingestion:** The /api/refresh-news endpoint triggers scripts/ingest.js. This script fetches BBC Tech RSS feeds, cleans the data, and generates embeddings using text-embedding-004.  
* **Indexing:** These 768-dimensional vectors are upserted into **Qdrant Cloud** with a payload containing the article title and content.  
* **Retrieval:** When a user asks a question, we convert it to a vector and perform a Cosine Similarity search to retrieve the top 3 most relevant news chunks.

### **2\. Redis Caching & Memory**

We use **Upstash Redis** to make our stateless API "stateful".

* **Session Persistence:** Chat history is stored in Redis Lists (lpush/lrange) keyed by chat:{sessionId}.  
* **TTL Configuration:** To optimize memory usage, we set a **Time-To-Live (TTL)** of 86400 seconds (24 hours) on every session key. This ensures old conversations automatically expire.  
* **Cache Warming:** The "Refresh News" feature acts as an on-demand cache warmer. It pre-loads the Vector Database with fresh data without requiring a server restart, ensuring high availability.

## **🛠️ Tech Stack**

* **Runtime:** Node.js, Express  
* **LLM:** Google Gemini (gemini-2.5-flash-lite / 1.5-flash)  
* **Vector Database:** Qdrant (Cloud)  
* **Caching:** Upstash Redis (Serverless)  
* **Tools:** rss-parser (Data fetching), child\_process (Script execution)

## **🔌 API Reference**

### **1\. Chat**

POST /api/chat  
Interacts with the LLM.

* **Body:** { "message": "What is AI?", "sessionId": "sess\_123" }  
* **Response:** { "reply": "..." }

### **2\. Get History**

GET /api/history/:sessionId  
Fetches past conversation context from Redis.

### **3\. Refresh News (Cache Warming)**

POST /api/refresh-news  
Triggers the ingestion script to fetch and index new articles.

## **🏃‍♂️ Local Setup**

1. **Clone the repo:**  
   git clone \<your-repo-url\>  
   cd voosh-backend

2. **Install Dependencies:**  
   npm install

3. **Environment Variables (.env):**  
   GEMINI\_API\_KEY=...  
   QDRANT\_URL=...  
   QDRANT\_API\_KEY=...  
   UPSTASH\_REDIS\_REST\_URL=...  
   UPSTASH\_REDIS\_REST\_TOKEN=...

4. **Run Server:**  
   npm start  
