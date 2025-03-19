
import express from 'express';
import { EmbeddingController } from '../controllers/embedding.controller';


const router = express.Router();
const embeddingController = new EmbeddingController();

router.post('/embed', embeddingController.embedText);
router.post('/embed-bulk', embeddingController.bulkEmbedTexts);
router.post('/search', embeddingController.searchSimilarDocuments);

export default router;