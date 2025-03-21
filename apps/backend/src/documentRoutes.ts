import express from 'express';
import multer from 'multer';
import { DocumentController } from '../src/documentController';

// Configure multer for memory storage with better error handling
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Check if file exists
    if (!file) {
      return cb(new Error('No file provided'), false);
    }
    
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    } else {
      return cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Create a function that returns the router with initialized Pinecone client
export function createDocumentRoutes(pineconeClient: any) {
  const router = express.Router();
  const documentController = new DocumentController();

  // Route for embedding text
  router.post('/embed-text', (req, res) => {
    documentController.embedText(req, res, pineconeClient);
  });

  // Route for uploading PDF files with error handling
  router.post('/upload-pdf', (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        // Handle Multer errors
        if (err instanceof multer.MulterError) {
          // A Multer error occurred
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File size exceeds the 10MB limit' });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else {
          // An unknown error occurred
          return res.status(400).json({ error: err.message });
        }
      }
      
      // If no error, proceed to controller
      documentController.uploadPDF(req, res, pineconeClient);
    });
  });

  return router;
}