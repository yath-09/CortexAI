// src/services/embeddingService.ts
import { OpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { VectorStore } from '@langchain/core/vectorstores';
import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Initialize Pinecone
async function initPinecone() {
  const pinecone = new PineconeClient();
  await pinecone.init({
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
  });
  return pinecone;
}

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private pineconeClient: PineconeClient | null = null;
  private indexName: string;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small', // Using OpenAI's embedding model
    });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'payguard-knowledge';
    this.initializeService();
  }

  private async initializeService() {
    this.pineconeClient = await initPinecone();
  }

  async embedText(text: string, metadata: Record<string, any> = {}) {
    try {
      if (!this.pineconeClient) {
        throw new Error('Pinecone client not initialized');
      }

      // Create a document with text and metadata
      const document = new Document({
        pageContent: text,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          source: 'text-input',
        },
      });

      // Get the index from Pinecone
      const index = this.pineconeClient.Index(this.indexName);
      // Create vector store with the document
      await PineconeStore.fromDocuments([document], this.embeddings, {
        pineconeIndex: index,
        namespace: 'banking-data',
      });

      // Save reference to the document in Prisma
      const savedDocument = await prisma.knowledgeBase.create({
        data: {
          content: text,
          contentType: 'text',
          metadata: metadata,
          embeddingId: `${metadata.id || Date.now()}`, // Use metadata ID or generate one
        },
      });

      return {
        success: true,
        documentId: savedDocument.id,
        message: 'Text successfully embedded and stored',
      };
    } catch (error: any) {
      console.error('Error embedding text:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to embed text',
      };
    }
  }

  async searchSimilarDocuments(query: string, topK: number = 5) {
    try {
      if (!this.pineconeClient) {
        throw new Error('Pinecone client not initialized');
      }

      const index = this.pineconeClient.Index(this.indexName);
      
      // Create vector store
      const vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: index,
          namespace: 'banking-data',
        }
      );

      // Search for similar documents
      const results = await vectorStore.similaritySearch(query, topK);
      
      return {
        success: true,
        results,
      };
    } catch (error: any) {
      console.error('Error searching documents:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async bulkEmbedTexts(texts: { content: string; metadata: Record<string, any> }[]) {
    try {
      if (!this.pineconeClient) {
        throw new Error('Pinecone client not initialized');
      }

      const documents = texts.map(
        item => new Document({
          pageContent: item.content,
          metadata: {
            ...item.metadata,
            createdAt: new Date().toISOString(),
            source: 'text-input',
          },
        })
      );

      // Get the index from Pinecone
      const index = this.pineconeClient.Index(this.indexName);

      // Create vector store with the documents
      await PineconeStore.fromDocuments(documents, this.embeddings, {
        pineconeIndex: index,
        namespace: 'banking-data',
      });

      // Save references to the documents in Prisma
      const savedDocuments = await prisma.knowledgeBase.createMany({
        data: texts.map(item => ({
          content: item.content,
          contentType: 'text',
          metadata: item.metadata,
          embeddingId: `${item.metadata.id || Date.now()}-${Math.random().toString(36).substring(7)}`,
        })),
      });

      return {
        success: true,
        message: `${texts.length} texts successfully embedded and stored`,
      };
    } catch (error: any) {
      console.error('Error embedding texts in bulk:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to embed texts in bulk',
      };
    }
  }
}