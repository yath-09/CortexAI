// src/index.ts

import express from "express";
import dotenv from "dotenv";
import { initPinecone } from "./src/services/pinecone";
import { createDocumentRoutes } from "./src/routes/documentRoutes";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createQueryRoutes } from "./src/routes/queryRoutes";
import { createChatRoutes } from "./src/routes/chatRoute";
import Redis from "ioredis";
import { RedisStore } from "rate-limit-redis";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Apply middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '50mb' })); // Increased limit for large text payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Redis client with connection string
// const redisClient = new Redis(process.env.REDIS_CONNECTION_STRING || "redis://localhost:6379", {
//   enableReadyCheck: true,
//   retryStrategy: (times) => {
//     // Retry connection with exponential backoff
//     const delay = Math.min(times * 50, 2000);
//     return delay;
//   }
// });

// redisClient.on("error", (err) => {
//   console.error("Redis error:", err);
// });

// redisClient.on("connect", () => {
//   console.log("Connected to Redis successfully");
// });

// Configure rate limiter with Redis store
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
//   message: "Too many requests from this IP, please try again after 15 minutes",
//   store: new RedisStore({
//     // @ts-expect-error - Known compatibility issue with @types/ioredis
//     sendCommand: (...args: string[]) => redisClient.call(...args),
//     prefix: "rate-limit:",
//     expiry: 15 * 60, // 15 minutes in seconds (matching windowMs)
//   }),
// });

// Apply rate limiter to all requests
// app.use(limiter);

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
  res.json({
    status: "ok",
    pineconeStatus: pineconeClient ? "connected" : "disconnected",
    // redisStatus: redisClient.status === "ready" ? "connected" : "disconnected"
  });
});

// Graceful shutdown
// process.on("SIGTERM", async () => {
//   console.log("SIGTERM signal received, closing connections");
//   await redisClient.quit();
//   process.exit(0);
// });

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));