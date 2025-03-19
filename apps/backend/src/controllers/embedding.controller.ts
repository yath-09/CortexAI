// src/controllers/embeddingController.ts

import { Request, Response } from 'express';
import { EmbeddingService } from '../services/embedding.services';


const embeddingService = new EmbeddingService();

export class EmbeddingController {
  async embedText(req: Request, res: Response) {
    try {
      const { text, metadata } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Text is required and must be a string' 
        });
      }

      const result = await embeddingService.embedText(text, metadata || {});
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      console.error('Controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async bulkEmbedTexts(req: Request, res: Response) {
    try {
      const { texts } = req.body;
      
      if (!Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'A non-empty array of texts is required' 
        });
      }

      // Validate each text item
      for (const item of texts) {
        if (!item.content || typeof item.content !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Each text item must have a content property of type string'
          });
        }
      }

      const result = await embeddingService.bulkEmbedTexts(texts);
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      console.error('Controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  async searchSimilarDocuments(req: Request, res: Response) {
    try {
      const { query, topK } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Query is required and must be a string' 
        });
      }

      const result = await embeddingService.searchSimilarDocuments(query, topK || 5);
      return res.status(result.success ? 200 : 500).json(result);
    } catch (error: any) {
      console.error('Controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

