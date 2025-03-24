import express from 'express';
import multer from 'multer';
import { DocumentController } from '../controller/documentController';
import { AuthMiddleware } from '../utils/middleware';


// Configure multer for memory storage (files stored in buffer)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // Limit file size to 15MB
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Create a function that returns the router with initialized Pinecone client
export function createDocumentRoutes(pineconeClient: any) {
  const router = express.Router();
  const documentController = new DocumentController();

  // Route for uploading PDF files with error handling
  router.post('/upload-pdf', AuthMiddleware.authenticateUser,AuthMiddleware.getOpenAIKey,(req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        // Handle Multer errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File size exceeds the 15MB limit' });
          }
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else {
          return res.status(400).json({ error: err.message });
        }
      }
      
      // If no error, proceed to controller
      documentController.uploadPDF(req, res, pineconeClient);
    });
  });

  // Route to get all documents
  router.get('/documents', AuthMiddleware.authenticateUser,(req, res) => {
    documentController.getAllDocuments(req, res);
  });

  // Route to get a specific document
  router.get('/documents/:id',AuthMiddleware.authenticateUser,(req, res) => {
    documentController.getDocumentById(req, res);
  });

  // Route to delete a document
  router.delete('/documents/:id',AuthMiddleware.authenticateUser,(req, res) => {
    documentController.deleteDocument(req, res, pineconeClient);
  });

  return router;
}