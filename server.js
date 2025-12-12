import express from "express";
import chatRoutes from "./routes/chatRoutes.js"
import newsRoutes from "./routes/newsRoutes.js";
import cors from "cors";


import "dotenv/config";



const app = express();
app.use(express.json());
app.use(cors());

app.use("/api", chatRoutes);
app.use("/api", newsRoutes);
app.get("/", (req, res) => {
  res.send("✅ Voosh Chatbot API is running!");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at ${PORT}`);
});
