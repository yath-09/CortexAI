import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import crypto from 'crypto';
import { prismaClient } from "db";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { 
  TextractClient, 
  StartDocumentTextDetectionCommand, 
  GetDocumentTextDetectionCommand 
} from "@aws-sdk/client-textract";
import { spawn } from 'child_process';
// No direct dependency on pdf-parse to avoid test file requirements

export class PDFProcessingService {
  private s3Client: S3Client;
  private textractClient: TextractClient;
  
  constructor() {
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Initialize Textract client
    this.textractClient = new TextractClient({
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
   * Check if a PDF is machine-readable or scanned
   * @param filePath - Path to the PDF file
   * @returns Boolean indicating if the PDF is machine-readable
   */
  async isPDFMachineReadable(filePath: string): Promise<boolean> {
    try {
      // Use PDFLoader from LangChain that we're already using
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();
      
      // If we get documents with reasonable text content, it's likely machine-readable
      // Calculate the average text per page
      const totalText = docs.reduce((sum, doc) => sum + doc.pageContent.trim().length, 0);
      const pageCount = docs.length;
      
      // Threshold: less than 100 characters per page on average suggests a scanned document
      const textDensity = totalText / Math.max(1, pageCount);
      console.log(`PDF text density: ${textDensity} characters per page`);
      
      return textDensity > 100;
    } catch (error) {
      console.error("Error determining if PDF is machine-readable:", error);
      // If we can't determine, default to using Textract to be safe
      return false;
    }
  }

  /**
   * Process a PDF using Amazon Textract
   * @param s3Info - S3 storage information
   * @returns Extracted text from the PDF
   */
  async extractTextWithTextract(s3Info: {key: string, bucket: string}): Promise<string> {
    try {
      // Start text detection job
      const startCommand = new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: {
            Bucket: s3Info.bucket,
            Name: s3Info.key
          }
        }
      });
      
      const startResponse = await this.textractClient.send(startCommand);
      const jobId = startResponse.JobId;
      
      if (!jobId) {
        throw new Error("Failed to start Textract job - no JobId returned");
      }

      console.log(`Started Textract job: ${jobId}`);
      
      // Poll for job completion
      let jobComplete = false;
      let extractedText = '';
      
      while (!jobComplete) {
        // Wait 3 seconds between polling
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const getResultsCommand = new GetDocumentTextDetectionCommand({
          JobId: jobId
        });
        
        const getResultsResponse = await this.textractClient.send(getResultsCommand);
        
        // Check job status
        if (getResultsResponse.JobStatus === 'SUCCEEDED') {
          jobComplete = true;
          
          // Collect all blocks of text
          let nextToken = getResultsResponse.NextToken;
          let pages = getResultsResponse.Blocks || [];
          
          // Compile text from all blocks
          pages.forEach(block => {
            if (block.BlockType === 'LINE' && block.Text) {
              extractedText += block.Text + ' ';
            }
          });
          
          // Get additional pages if available
          while (nextToken) {
            const getMoreResultsCommand = new GetDocumentTextDetectionCommand({
              JobId: jobId,
              NextToken: nextToken
            });
            
            const moreResults = await this.textractClient.send(getMoreResultsCommand);
            nextToken = moreResults.NextToken;
            
            (moreResults.Blocks || []).forEach(block => {
              if (block.BlockType === 'LINE' && block.Text) {
                extractedText += block.Text + ' ';
              }
            });
          }
        } else if (getResultsResponse.JobStatus === 'FAILED') {
          throw new Error(`Textract job failed: ${getResultsResponse.StatusMessage}`);
        }
        // Otherwise, job is still in progress, continue polling
      }
      
      return extractedText;
    } catch (error) {
      console.error("Error extracting text with Textract:", error);
      throw error;
    }
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
    metadata: Record<string, any> = {},
    userOpenAIKey: string,
  ): Promise<any> {
    let filePath = '';
    
    try {
      // Initialize embeddings with user's OpenAI key
      const embeddings = new OpenAIEmbeddings({
        apiKey: userOpenAIKey,
        modelName: "text-embedding-3-small",
      });

      // 1. Upload to S3
      const s3Info = await this.uploadToS3(buffer, filename);
      
      // 2. Save temporarily for processing
      filePath = await this.savePDFToDisk(buffer, filename);
      
      // 3. Create document record in database
      const university = await prismaClient.user.findFirst({
        where: {
          userId: userId,
        },
        select: {
          role: true,
          universityName: true,
        },
      });

      const document = await prismaClient.document.create({
        data: {
          userId: userId,
          title: metadata.title || filename,
          filename: filename,
          contentType: 'pdf',
          s3Key: s3Info.key,
          s3Bucket: s3Info.bucket,
          s3Region: s3Info.region,
          pineconeNamespace: `university-${university?.universityName}`,
          metadata: metadata,
          universityName: university?.universityName
        }
      });
      
      console.log(`Created document record with ID: ${document.id}`);
      
      // 4. Determine if the PDF is machine-readable or scanned
      const isMachineReadable = await this.isPDFMachineReadable(filePath);
      
      // 5. Extract text using the appropriate method
      let allText = '';
      
      if (isMachineReadable) {
        console.log(`PDF is machine-readable, using standard extraction for ${filename}`);
        // Use standard PDFLoader
        const loader = new PDFLoader(filePath);
        const docs = await loader.load();
        allText = docs.map(doc => doc.pageContent).join('\n');
      } else {
        console.log(`PDF appears to be scanned, using Textract for ${filename}`);
        // Use Amazon Textract for OCR
        allText = await this.extractTextWithTextract(s3Info);
      }
      
      // 6. Create a text splitter
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 40,
        separators: ["\n\n", "\n", ".", " ", ""], // progressively fall back
      });
      
      // 7. Split the text into chunks
      const chunks = await textSplitter.createDocuments([allText]);
      console.log(`Split PDF into ${chunks.length} chunks`);
      
      // 8. Get the index from Pinecone
      const index = pineconeClient.index(process.env.PINECONE_INDEX!);
      const namespace = index.namespace(document.pineconeNamespace);
      
      // 9. Process each chunk and store in Pinecone
      const vectors = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate a unique ID for this chunk
        const chunkId = `pdf-${document.id}-chunk-${i}`;
        
        // Create embeddings for the chunk
        const vector = await embeddings.embedQuery(chunk.pageContent);
        
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
          extractionMethod: isMachineReadable ? 'standard' : 'textract',
        };
        
        // Store vector in Pinecone
        vectors.push({
          id: chunkId,
          values: vector,
          metadata: chunkMetadata
        });
      }
      
      // Batch upsert to Pinecone
      await namespace.upsert(vectors);
      
      // 10. Update document with chunk count and extraction method
      await prismaClient.document.update({
        where: { id: document.id },
        data: { 
          chunkCount: chunks.length,
          // metadata: {
          //   ...document.metadata,
          //   extractionMethod: isMachineReadable ? 'standard' : 'textract'
          // }
        }
      });
      
      // 11. Clean up the temporary file
      await fs.promises.unlink(filePath);
      
      return {
        success: true,
        message: `PDF processed and split into ${chunks.length} chunks`,
        documentId: document.id,
        s3Key: s3Info.key,
        s3Url: `https://${s3Info.bucket}.s3.${s3Info.region}.amazonaws.com/${s3Info.key}`,
        extractionMethod: isMachineReadable ? 'standard' : 'textract'
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