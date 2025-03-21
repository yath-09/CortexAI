// src/index.ts

import express from "express";
import dotenv from "dotenv";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { initPinecone } from "./src/pinecone";
import { createDocumentRoutes } from "./src/documentRoutes";
import cors from "cors";
import helmet from "helmet";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Apply middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' })); // Increased limit for large text payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize OpenAI chat model
const openai = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  modelName: "gpt-4-turbo",
});

// Initialize embeddings with correct model
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
  batchSize: 512,
  modelName: "text-embedding-ada-002",
});

// Initialize Pinecone client
let pineconeClient: any;
initPinecone()
  .then((client: any) => {
    pineconeClient = client;
    console.log("Pinecone client initialized successfully");
    
    // Register routes that require pineconeClient
    app.use("/api/documents", createDocumentRoutes(pineconeClient));
  })
  .catch((error) => {
    console.error("Failed to initialize Pinecone client:", error);
  });

// Basic health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok", pineconeStatus: pineconeClient ? "connected" : "disconnected" });
});

// Endpoint for querying embeddings
app.post("/query", async (req, res) => {
  try {
    // Use request body instead of hardcoded values
    const { text, topK = 3 } = req.body;
    
    if (!text) return res.status(400).json({ error: "Text is required" });

    // Check if Pinecone client is initialized
    if (!pineconeClient) {
      return res.status(503).json({ error: "Database not yet initialized" });
    }

    const vector = await embeddings.embedQuery(text);
    const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

    const queryResponse = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    res.json({ results: queryResponse.matches });
  } catch (error: any) {
    console.error("Error querying embeddings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint for chat interaction
app.post("/chat", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    // Check if Pinecone client is initialized
    if (!pineconeClient) {
      return res.status(503).json({ error: "Database not yet initialized" });
    }

    const vector = await embeddings.embedQuery(query);
    const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

    const queryResponse = await index.query({
      vector,
      topK: 5, // Increased to get more context
      includeMetadata: true,
    });

    // Check if matches were found
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return res.json({ 
        response: "I don't have enough information to answer that question." 
      });
    }

    // Extract text from metadata
    const relevantChunks = queryResponse.matches
      .filter((match: any) => match.metadata && match.metadata.text)
      .map((match: any) => match.metadata.text)
      .join("\n\n");

    // Use the correct format for calling the chat model
    const aiResponse = await openai.invoke([
      { role: "system", content: "You are PayGuard's banking assistant. Answer based on the context provided." },
      { role: "user", content: `Based on the following context:\n\n${relevantChunks}\n\nAnswer the query: ${query}` }
    ]);

    res.json({ response: aiResponse.content });
  } catch (error: any) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));