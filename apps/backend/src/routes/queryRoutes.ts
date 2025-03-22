// src/routes/queryRoutes.ts
import { Router } from "express";
import { QueryService } from "../services/queryService";
import { asyncHandler } from "../utils/middleware";

export function createQueryRoutes(pineconeClient: any) {
  const router = Router();
  const queryService = new QueryService(pineconeClient);

  router.post("/", asyncHandler(async (req, res) => {
    const { text, topK = 3 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const results = await queryService.queryEmbeddings(text, topK);
    res.json({ results });
  }));

  return router;
}