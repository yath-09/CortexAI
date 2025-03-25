//Streaming Chat Implementation

// src/routes/chatRoutes.ts
import { Router } from "express";
import { QueryService } from "../services/queryService";
import { asyncHandler, AuthMiddleware } from "../utils/middleware";
import { prismaClient } from "db";
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

  router.post("/updateApiKey",AuthMiddleware.authenticateUser,asyncHandler(async (req: any, res: any) => {
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { apiKey } = req.body;
      //console.log(apiKey)

      if (!apiKey) {
        return res.status(400).json({ error: "API Key is required" });
      }

      try {
        // Update the user's OpenAI API key
        const updatedUser = await prismaClient.user.update({
          where: { userId: req.userId },
          data: { openAIKey: apiKey },
        });

        return res.status(200).json({
          message: "API Key updated successfully",
          user: {
            email: updatedUser.email,
          },
        });
      } catch (error: any) {
        console.error("Error updating API key:", error);
        return res.status(500).json({
          error: "Failed to update API key",
          details: error.message || "Unknown error",
        });
      }
    })
  );

  return router;
}