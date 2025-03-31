//Streaming Chat Implementation

// src/routes/chatRoutes.ts
import { Router } from "express";
import { QueryService } from "../services/queryService";
import { asyncHandler, AuthMiddleware } from "../utils/middleware";
import { prismaClient } from "db";
export type MessageType = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  status?: "loading" | "complete" | "error";
};
export function createChatRoutes(pineconeClient: any) {
  const router = Router();
  const queryService = new QueryService(pineconeClient);

  // Regular non-streaming endpoint (keep for compatibility)
  router.post("/", AuthMiddleware.authenticateUser, AuthMiddleware.getOpenAIKey, asyncHandler(async (req: any, res: any) => {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await queryService.processChat(query, req.openAIKey);
    res.json({ response });
  }));

  // New streaming endpoint
  router.post("/stream", AuthMiddleware.authenticateUser, AuthMiddleware.getOpenAIKey, asyncHandler(async (req: any, res: any) => {
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
      await queryService.processChatStream(query, res, req.openAIKey!, req.userId!);

      // End the stream
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
      res.end();
    }
  }));

  router.post("/updateApiKey", AuthMiddleware.authenticateUser, asyncHandler(async (req: any, res: any) => {
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


  // Create a new chat session
  router.post(
    "/addChatSession",
    AuthMiddleware.authenticateUser,
    asyncHandler(async (req: any, res: any) => {
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { chatMessages }: { chatMessages: MessageType[] } = req.body;

      if (!Array.isArray(chatMessages) || chatMessages.length === 0) {
        return res.status(400).json({ error: "Invalid messages array" });
      }

      // Ensure the chat is initiated by the user, not the assistant
      if (chatMessages && chatMessages.length == 1 && chatMessages[0]?.role === "assistant") {
        return res.status(202).json({ success: false, message: "Please initiate a chat first" });
      }

      const title = chatMessages[1]?.content || "Untitled Chat"; // Default title

      try {
        const newChat = await prismaClient.chatHistory.create({
          data: {
            userId: req.userId,
            messages: chatMessages,
            title: title,
          },
        });

        res.status(201).json({ success: true, id: newChat.id, title: newChat.title });
      } catch (error) {
        console.error("Error adding chat session:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    })
  );

  // Update an existing chat session
  router.put("/updateChatSession/:id", AuthMiddleware.authenticateUser, asyncHandler(async (req: any, res: any) => {
    if (!req.userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const { chatMessages }: { chatMessages: MessageType[] } = req.body;

    if (!Array.isArray(chatMessages) || chatMessages.length === 0) {
      return res.status(400).json({ error: "Invalid messages array" });
    }

    try {
      // Verify the chat session belongs to the user
      const existingChat = await prismaClient.chatHistory.findUnique({
        where: {
          id: id,
          userId: req.userId
        }
      });

      if (!existingChat) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      // Update the chat session with new messages
      const updatedChat = await prismaClient.chatHistory.update({
        where: { id: id },
        data: {
          messages: chatMessages,
        },
      });

      res.status(200).json({ success: true, id: updatedChat.id });
    } catch (error) {
      console.error("Error updating chat session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })
  );

  router.get(
    "/getUserChats",
    AuthMiddleware.authenticateUser,
    asyncHandler(async (req: any, res: any) => {
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      try {
        const chats = await prismaClient.chatHistory.findMany({
          where: { userId: req.userId },
          select: { id: true, title: true, createdAt: true }, // Only fetch relevant fields
          orderBy: { createdAt: "desc" },
        });

        res.status(200).json({ success: true, chats });
      } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    })
  );


  router.get(
    "/getUserChats/:chatId",
    AuthMiddleware.authenticateUser,
    asyncHandler(async (req: any, res: any) => {
      const { chatId } = req.params;
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      try {
        const chats = await prismaClient.chatHistory.findMany({
          where: { userId: req.userId, id: chatId },
          select: { id: true, title: true, createdAt: true, messages: true }, // Only fetch relevant fields
          orderBy: { createdAt: "desc" },
        });

        res.status(200).json({ success: true, chats });
      } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    })
  );


  router.put(
    "/updateChatTitle/:chatId",
    AuthMiddleware.authenticateUser,
    asyncHandler(async (req: any, res: any) => {
      const { chatId } = req.params;
      const { title } = req.body;
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Invalid title" });
      }

      try {
        const updatedChat = await prismaClient.chatHistory.update({
          where: { id: chatId, userId: req.userId },
          data: { title },
        });

        res.status(200).json({ success: true, title: updatedChat.title });
      } catch (error) {
        console.error("Error updating chat title:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    })
  );

  router.delete(
    "/deleteChatSession/:currentChatSessionId",
    AuthMiddleware.authenticateUser,
    asyncHandler(async (req: any, res: any) => {
      const { currentChatSessionId } = req.params;
    
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      try {
        const deletedChat = await prismaClient.chatHistory.delete({
          where: { id: currentChatSessionId, userId: req.userId },
        });

        res.status(200).json({ success: true });
      } catch (error) {
        console.error("Error deleting chat", error);
        res.status(500).json({ error: "Internal server error" });
      }
    })
  );

  return router;
}