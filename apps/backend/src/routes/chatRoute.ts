//Streaming Chat Implementation

// src/routes/chatRoutes.ts
import { Router } from "express";
import { QueryService } from "../services/queryService";
import { asyncHandler, AuthMiddleware } from "../utils/middleware";

export function createChatRoutes(pineconeClient: any) {
  const router = Router();
  const queryService = new QueryService(pineconeClient);

  // Regular non-streaming endpoint (keep for compatibility)
  router.post("/",AuthMiddleware.authenticateUser,AuthMiddleware.getOpenAIKey, asyncHandler(async (req:any, res:any) => {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await queryService.processChat(query,req.openAIKey);
    res.json({ response });
  }));

  // New streaming endpoint
  router.post("/stream",AuthMiddleware.authenticateUser,AuthMiddleware.getOpenAIKey,asyncHandler(async (req:any, res:any) => {
    if (!req.userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial message
    //res.write(`data: ${JSON.stringify({ type: 'status', content: 'Searching knowledge base...' })}\n\n`);

    try {
      // Stream the response
      await queryService.processChatStream(query, res,req.openAIKey!,req.userId!);

      // End the stream
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
      res.end();
    }
  }));

  return router;
}