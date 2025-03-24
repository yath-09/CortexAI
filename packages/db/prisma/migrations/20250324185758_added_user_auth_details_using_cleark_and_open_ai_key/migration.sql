/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "documents_contentType_idx";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "openAIKey" TEXT DEFAULT '',
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "documents_contentType_userId_idx" ON "documents"("contentType", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");
