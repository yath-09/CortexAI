// src/routes/chatRoutes.ts
import { Router } from "express";
import { QueryService } from "../services/queryService";
import { asyncHandler } from "../utils/middleware";

export function createChatRoutes(pineconeClient: any) {
  const router = Router();
  const queryService = new QueryService(pineconeClient);

  router.post("/", asyncHandler(async (req, res) => {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await queryService.processChat(query);
    res.json({ response });
  }));

  return router;
}