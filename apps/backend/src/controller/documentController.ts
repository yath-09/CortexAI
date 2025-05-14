// src/controllers/documentController.ts

// src/controllers/documentController.ts
import type { Request, Response } from 'express';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFProcessingService } from '../services/pdfService';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import crypto from 'crypto';
import { prismaClient } from "db"

const pdfService = new PDFProcessingService();

export class DocumentController {
  /**
   * Handle text embedding requests
   * Splits long text into chunks and embeds each chunk separately
   */
  async embedText(req: Request, res: Response, pineconeClient: any) {
    try {
      const { text, id, metadata = {} } = req.body;

      // Validate required fields
      if (!text || !id) {
        return res.status(400).json({ error: "Text & ID required" });
      }

      // Check if Pinecone client is initialized
      if (!pineconeClient) {
        return res.status(503).json({ error: "Database not yet initialized" });
      }
      // Ensure OpenAI key is available
      if (!req.openAIKey) {
        return res.status(403).json({ error: "OpenAI API key is required" });
      }
      // Initialize embeddings with user's OpenAI key
      const embeddings = new OpenAIEmbeddings({
        apiKey: req.openAIKey,
        modelName: "text-embedding-3-small",
      });

      // For long texts, split into chunks
      // Create a text splitter with specific configuration
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, // Size of each chunk in characters
        chunkOverlap: 200, // Overlap between chunks to maintain context
      });

      // Split the text into chunks
      const chunks = await textSplitter.createDocuments([text]);
      console.log(`Split text into ${chunks.length} chunks`);

      // Get the index from Pinecone
      const index = pineconeClient.Index(process.env.PINECONE_INDEX!);

      // Store each chunk in database and Pinecone
      const storedChunks = [];

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate a unique ID for this chunk
        const chunkId = `text-${id}-chunk-${i}-${crypto.randomBytes(4).toString('hex')}`;

        // Create embeddings for the chunk
        const vector = await embeddings.embedQuery(chunk.pageContent);

        // Create enhanced metadata
        const chunkMetadata = {
          ...metadata,
          sourceId: id,
          chunkIndex: i,
          totalChunks: chunks.length,
          type: 'text',
          text: chunk.pageContent, // Store the original text in metadata
        };

        // Store vector in Pinecone
        await index.upsert([{
          id: chunkId,
          values: vector,
          metadata: chunkMetadata
        }]);

        // Store reference in database using Prisma
        // const dbEntry = await prismaClient.documentChunk.create({
        //   data: {
        //     id: chunkId,
        //     content: chunk.pageContent,
        //     contentType: 'text',
        //     metadata: chunkMetadata,
        //     documentId: id, // Group chunks by original document ID
        //     embeddingId: chunkId, // Same as the Pinecone ID
        //   }
        // });

        // storedChunks.push(dbEntry);
      }

      return res.json({
        success: true,
        message: `Text processed and split into ${chunks.length} chunks`,
        chunks: storedChunks.length,
        documentId: id
      });
    } catch (error: any) {
      console.error("Error embedding text:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: "Internal Server Error"
      });
    }
  }

  /**
   * Handle PDF file uploads
   * Processes the PDF, extracts text, splits into chunks, and embeds each chunk
   */
  /**
   * Handle PDF upload
   */
  async uploadPDF(req: Request, res: Response, pineconeClient: any) {
    try {

      // Ensure user is authenticated and userId is available
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Check if Pinecone client is initialized
      if (!pineconeClient) {
        return res.status(503).json({ error: "Vector database not yet initialized" });
      }
      if (!req.openAIKey) {
        return res.status(503).json({ error: "Open Api key needed" });
      }

      // Extract metadata from the request body
      let metadata = {};
      try {
        metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
      } catch (parseError) {
        console.warn("Error parsing metadata JSON:", parseError);
      }

      // Process the PDF file directly with the buffer
      const result = await pdfService.processPDF(
        req.file.buffer,
        req.file.originalname,
        pineconeClient,
        req.userId,  // Pass user ID
        metadata,
        req.openAIKey!,
      );

      if (result.success) {
        return res.json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to process PDF upload"
      });
    }
  }

  /**
   * Get a list of all documents
   */
  /**
   * Get all documents with pagination and filtering options
   */
  async getAllDocuments(req: Request, res: Response) {
    try {
      // Ensure user is authenticated and userId is available(for safety only)
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      // Extract query parameters
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as string) || 'desc';
      const searchTerm = req.query.search as string;

      // Calculate pagination
      const skip = (page - 1) * pageSize;

      // Build the where clause for filtering
      const where: any = {};
      if (searchTerm) {
        where.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { filename: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }

      const university = await prismaClient.user.findFirst({
        where: {
          userId: req.userId,
        },
        select: {
          role: true,
          universityName: true,
        },
      })

      // if (!university?.role !=admin) {
      //   return res.status(404).json({ error: "Document not found" });
      // }

      // Get documents with pagination, sorting, and filtering
      const documents = await prismaClient.document.findMany({
        where: {
          universityName: university?.universityName
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
        // Select only the fields you need
        select: {
          id: true,
          title: true,
          filename: true,
          createdAt: true,
          s3Key: true,
          s3Bucket: true,
          s3Region: true,
          // Omit large fields like full metadata unless needed
        }
      });
      if (!documents) {
        return res.status(404).json({ error: "Document not found" });
      }
      // Count total matching documents (for pagination info)
      const totalCount = documents.length;

      const documentsWithS3Urls = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        createdAt: doc.createdAt,
        s3Url: `https://${doc.s3Bucket}.s3.${doc.s3Region}.amazonaws.com/${doc.s3Key}`
      }));
      // Return documents with pagination metadata
      return res.json({
        documents: documentsWithS3Urls,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasMore: page < Math.ceil(totalCount / pageSize)
        }
      });
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get a single document by ID with efficient field selection
   */
  async getDocumentById(req: Request, res: Response) {
    try {
      // Ensure user is authenticated and userId is available
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { id } = req.params;

      const document = await prismaClient.document.findUnique({
        where: { id },
        // Select specific fields to optimize response size
        select: {
          id: true,
          title: true,
          filename: true,
          s3Key: true,
          s3Bucket: true,
          s3Region: true,
        }
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Calculate S3 URL on the fly instead of storing it
      const s3Url = `https://${document.s3Bucket}.s3.${document.s3Region}.amazonaws.com/${document.s3Key}`;

      return res.json({
        document: {
          id: document.id,
          title: document.title,
          filename: document.filename,
          s3Url,  // Only include the final S3 URL
        }
      });

    } catch (error: any) {
      console.error("Error fetching document:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete a document with optimized approach
   */
  async deleteDocument(req: Request, res: Response, pineconeClient: any) {
    try {
      // Ensure user is authenticated and userId is available
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const { id } = req.params;

      // Get only the necessary fields for deletion
      const document = await prismaClient.document.findUnique({
        where: { id },
        select: {
          id: true,
          pineconeNamespace: true,
          s3Key: true,
          s3Bucket: true,
          s3Region: true,
          chunkCount: true
        }
      });

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete operations
      const deleteOperations = [];

      // 1. Delete from Pinecone if namespace exists
      if (document.pineconeNamespace && pineconeClient) {
        try {
          // Make sure we have a valid index name from environment variables
          const indexName = process.env.PINECONE_INDEX;

          if (!indexName) {
            console.error("Missing PINECONE_INDEX environment variable");
          } else {
            // Get the index
            const index = pineconeClient.index(indexName);

            // Get the namespace
            const namespace = index.namespace(document.pineconeNamespace);

            try {
              const maxChunks = document.chunkCount; // This should be set to a reasonable maximum for your app
              let vectorIds = [];

              for (let i = 0; i < maxChunks; i++) {
                vectorIds.push(`pdf-${document.id}-chunk-${i}`);
              }
              console.log(`No vector query capability, attempting to delete up to ${maxChunks} chunks using pattern`);
              // Delete vectors in batches of 100 to avoid overloading Pinecone
              const batchSize = 100;
              for (let i = 0; i < vectorIds.length; i += batchSize) {
                const batch = vectorIds.slice(i, i + batchSize);
                deleteOperations.push(namespace.deleteMany(batch));
              }

              console.log(`Scheduled deletion of ${vectorIds.length} vectors for document ${id}`);
            } catch (vectorError) {
              console.error("Error finding/deleting vectors:", vectorError);
            }
          }
        } catch (pineconeError) {
          // Log but continue with other deletions
          console.error("Error with Pinecone deletion:", pineconeError);
        }
      }

      // 2. Delete from S3 if the key and bucket exist
      if (document.s3Key && document.s3Bucket) {
        try {
          deleteOperations.push(
            pdfService.deleteFromS3(document.s3Bucket, document.s3Key)
          );
        } catch (s3Error) {
          // Log but continue with other deletions
          console.error("Error with S3 deletion:", s3Error);
        }
      }

      // 3. Delete document from database
      deleteOperations.push(
        prismaClient.document.delete({
          where: { id }
        })
      );

      // Run deletions in parallel
      await Promise.all(deleteOperations);

      return res.json({
        success: true,
        message: "Document and associated data deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}