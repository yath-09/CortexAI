import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import crypto from 'crypto';
import { prismaClient } from "db";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export class PDFProcessingService {
  private embeddings: OpenAIEmbeddings;
  private s3Client: S3Client;
  
  constructor() {
    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY!,
      modelName: "text-embedding-ada-002",
    });
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  /**
   * Upload file to S3
   * @param buffer - File buffer
   * @param filename - Original filename
   * @returns S3 storage information
   */
  async uploadToS3(buffer: Buffer, filename: string): Promise<{key: string, bucket: string, region: string}> {
    const bucket = process.env.S3_BUCKET_NAME!;
    const region = process.env.AWS_REGION || 'ap-south-1';
    
    // Create a unique object key to prevent collisions
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `documents/${uniqueId}-${sanitizedFilename}`;
    
    // Upload to S3
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf'
      });
      
      await this.s3Client.send(command);
      console.log(`Uploaded file to S3: ${key}`);
      
      return {
        key,
        bucket,
        region
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }
  
   /**
   * Delete file from S3
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @returns Success status
   */
   async deleteFromS3(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      });
      
      await this.s3Client.send(command);
      console.log(`Deleted file from S3: ${key}`);
      return true;
    } catch (error) {
      console.error(`Error deleting file from S3 (${bucket}/${key}):`, error);
      throw error;
    }
  }



  /**
   * Save PDF file to disk temporarily (for processing)
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
   * Process PDF file, extract text, split into chunks, embed, and store in S3
   * @param buffer - PDF file buffer
   * @param filename - Original filename
   * @param pineconeClient - Initialized Pinecone client
   * @param metadata - Additional metadata
   * @returns Processing results
   */
  async processPDF(
    buffer: Buffer, 
    filename: string, 
    pineconeClient: any, 
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<any> {
    let filePath = '';
    
    try {
      // 1. Upload to S3
      const s3Info = await this.uploadToS3(buffer, filename);
      
      // 2. Save temporarily for processing
      filePath = await this.savePDFToDisk(buffer, filename);
      
      // 3. Create document record in database
      const document = await prismaClient.document.create({
        data: {
          userId:userId,
          title: metadata.title || filename,
          filename: filename,
          contentType: 'pdf',
          s3Key: s3Info.key,
          s3Bucket: s3Info.bucket,
          s3Region: s3Info.region,
          pineconeNamespace: `${userId}`,//this can be segmented onto diff users and diff id's further when we add the data this is imp point
          metadata: metadata
        }
      });
      
      console.log(`Created document record with ID: ${document.id}`);
      
      // 4. Load PDF and extract text
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      
      // 5. Combine all pages into one text
      const allText = docs.map(doc => doc.pageContent).join('\n');
      
      // 6. Create a text splitter
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      // 7. Split the text into chunks
      const chunks = await textSplitter.createDocuments([allText]);
      console.log(`Split PDF into ${chunks.length} chunks`);
      
      // 8. Get the index from Pinecone
      const index = pineconeClient.index(process.env.PINECONE_INDEX!);
      const namespace = index.namespace(document.pineconeNamespace); //this is the same as user_userId for diif suer to be safee and fats accessible
      // 9. Process each chunk and store in Pinecone (not in PostgreSQL)
      const vectors = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate a unique ID for this chunk
        const chunkId = `pdf-${document.id}-chunk-${i}`;
        
        // Create embeddings for the chunk
        const vector = await this.embeddings.embedQuery(chunk.pageContent);
        
        // Create metadata for Pinecone
        const chunkMetadata = {
          ...metadata,
          documentId: document.id,
          source: filename,
          s3Key: s3Info.key,
          s3Bucket: s3Info.bucket,
          chunkIndex: i,
          totalChunks: chunks.length,
          type: 'pdf',
          text: chunk.pageContent,
        };
        
        // Store vector in Pinecone
        vectors.push({
          id: chunkId,
          values: vector,
          metadata: chunkMetadata
        });
      }
      
      // Batch upsert to Pinecone
      //await index.upsert(vectors,document.pineconeNamespace);
      await namespace.upsert(vectors);
      
      // 10. Update document with chunk count
      await prismaClient.document.update({
        where: { id: document.id },
        data: { chunkCount: chunks.length }
      });
      
      // 11. Clean up the temporary file
      await fs.promises.unlink(filePath);
      
      return {
        success: true,
        message: `PDF processed and split into ${chunks.length} chunks`,
        documentId: document.id,
        s3Key: s3Info.key,
        s3Url: `https://${s3Info.bucket}.s3.${s3Info.region}.amazonaws.com/${s3Info.key}`
      };
    } catch (error: any) {
      console.error("Error processing PDF:", error);
      
      // Try to clean up the temporary file if it exists
      if (filePath) {
        try {
          await fs.promises.unlink(filePath);
        } catch (unlinkError) {
          console.error("Failed to clean up temporary file:", unlinkError);
        }
      }
      
      return {
        success: false,
        error: error.message,
        message: "Failed to process PDF"
      };
    }
  }
}