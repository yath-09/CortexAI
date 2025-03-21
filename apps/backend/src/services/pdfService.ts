import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import crypto from 'crypto';
import { prismaClient } from "db";

export class PDFProcessingService {
  private embeddings: OpenAIEmbeddings;
  
  constructor() {
    // Initialize OpenAI embeddings with API key from environment variables
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY!,
      modelName: "text-embedding-ada-002",
    });
  }

  /**
   * Save PDF file to disk temporarily
   * @param buffer - PDF file buffer
   * @param filename - Original filename
   * @returns Path to saved file
   */
  async savePDFToDisk(buffer: Buffer, filename: string): Promise<string> {
    // Create unique filename to prevent collisions
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.]/g, '_');
    const tempFilename = `${uniqueId}-${sanitizedFilename}`;
    
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Full path to the file
    const filePath = path.join(uploadDir, tempFilename);
    
    // Write buffer to file
    await fs.promises.writeFile(filePath, buffer);
    
    return filePath;
  }

  /**
   * Process PDF file, extract text, split into chunks and embed
   * @param filePath - Path to the PDF file
   * @param pineconeClient - Initialized Pinecone client
   * @param metadata - Additional metadata to store with chunks
   * @returns Results of the processing operation
   */
  async processPDF(filePath: string, pineconeClient: any, metadata: Record<string, any> = {}): Promise<any> {
    try {
      // Get base filename for reference
      const baseFilename = path.basename(filePath);
      
      // First, create a Document record in the database
      const document = await prismaClient.document.create({
        data: {
          title: metadata.title || baseFilename,
          filename: baseFilename, 
          contentType: 'pdf',
          metadata: metadata
        }
      });
      
      console.log(`Created document record with ID: ${document.id}`);
      
      // Load PDF document using LangChain's PDFLoader
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      
      // Combine all pages into one text if needed
      const allText = docs.map(doc => doc.pageContent).join('\n');
      
      // Create a text splitter with specific configuration
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, // Size of each chunk in characters
        chunkOverlap: 200, // Overlap between chunks to maintain context
      });
      
      // Split the text into chunks
      const chunks = await textSplitter.createDocuments([allText]);
      console.log(`Split PDF into ${chunks.length} chunks`);
      
      // Get the index from Pinecone
      const index = pineconeClient.Index(process.env.PINECONE_INDEX!);
      
      // Store each chunk in database and Pinecone
      const storedChunks = [];
      
      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate a unique ID for this chunk
        const chunkId = `pdf-${document.id}-chunk-${i}-${crypto.randomBytes(4).toString('hex')}`;
        
        // Create embeddings for the chunk
        const vector = await this.embeddings.embedQuery(chunk.pageContent);
        
        // Create enhanced metadata
        const chunkMetadata = {
          ...metadata,
          source: baseFilename,
          documentId: document.id,
          chunkIndex: i,
          totalChunks: chunks.length,
          type: 'pdf',
          text: chunk.pageContent, // Store the original text in metadata
        };
        
        // Store vector in Pinecone
        await index.upsert([{
          id: chunkId,
          values: vector,
          metadata: chunkMetadata
        }]);
        
        // Store reference in database using Prisma
        const dbEntry = await prismaClient.documentChunk.create({
          data: {
            id: chunkId,
            content: chunk.pageContent,
            contentType: 'pdf',
            metadata: chunkMetadata,
            documentId: document.id, // Use the actual Document ID
            embeddingId: chunkId, // Same as the Pinecone ID
          }
        });
        
        storedChunks.push(dbEntry);
      }
      
      // Clean up the temporary file
      await fs.promises.unlink(filePath);
      
      return {
        success: true,
        message: `PDF processed and split into ${chunks.length} chunks`,
        chunks: storedChunks.length,
        documentId: document.id
      };
    } catch (error: any) {
      console.error("Error processing PDF:", error);
      
      // Try to clean up the file even if processing failed
      try {
        await fs.promises.unlink(filePath);
      } catch (unlinkError) {
        console.error("Failed to clean up temporary file:", unlinkError);
      }
      
      return {
        success: false,
        error: error.message,
        message: "Failed to process PDF"
      };
    }
  }
}