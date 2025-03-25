// src/index.ts

import express from "express";
import dotenv from "dotenv";
import { initPinecone } from "./src/services/pinecone";
import { createDocumentRoutes } from "./src/routes/documentRoutes";
import cors from "cors";
import helmet from "helmet";
import { createQueryRoutes } from "./src/routes/queryRoutes";
import { createChatRoutes } from "./src/routes/chatRoute";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Apply middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' })); // Increased limit for large text payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Pinecone client
let pineconeClient: any;
initPinecone()
  .then((client: any) => {
    pineconeClient = client;
    console.log("Pinecone client initialized successfully");
    
    // Register routes that require pineconeClient
    app.use("/api/documents", createDocumentRoutes(pineconeClient));
    app.use("/api/query", createQueryRoutes(pineconeClient));
    app.use("/api/chat", createChatRoutes(pineconeClient));
  })
  .catch((error) => {
    console.error("Failed to initialize Pinecone client:", error);
  });

// Basic health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok", pineconeStatus: pineconeClient ? "connected" : "disconnected" });
});



// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));