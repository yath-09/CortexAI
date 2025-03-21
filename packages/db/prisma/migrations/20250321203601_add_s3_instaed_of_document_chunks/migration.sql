/*
  Warnings:

  - You are about to drop the `document_chunks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "document_chunks" DROP CONSTRAINT "document_chunks_documentId_fkey";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pineconeNamespace" TEXT,
ADD COLUMN     "s3Bucket" TEXT,
ADD COLUMN     "s3Key" TEXT,
ADD COLUMN     "s3Region" TEXT;

-- DropTable
DROP TABLE "document_chunks";

-- CreateIndex
CREATE INDEX "documents_contentType_idx" ON "documents"("contentType");
