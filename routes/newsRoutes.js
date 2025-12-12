import express from "express";
import { refreshNews } from "../controllers/newsController.js";

const router = express.Router();

router.post("/refresh-news", refreshNews);

export default router;