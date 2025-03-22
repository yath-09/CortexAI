//Streaming Chat Implementation

// src/routes/chatRoutes.ts
import { Router } from "express";
import { QueryService } from "../services/queryService";
import { asyncHandler } from "../utils/middleware";

export function createChatRoutes(pineconeClient: any) {
  const router = Router();
  const queryService = new QueryService(pineconeClient);

  // Regular non-streaming endpoint (keep for compatibility)
  router.post("/", asyncHandler(async (req, res) => {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await queryService.processChat(query);
    res.json({ response });
  }));

  // New streaming endpoint
  router.post("/stream", asyncHandler(async (req, res) => {
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
      await queryService.processChatStream(query, res);

      // End the stream
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
      res.end();
    }
  }));

  // WebSocket implementation can be added here if using a WebSocket library

  return router;
}