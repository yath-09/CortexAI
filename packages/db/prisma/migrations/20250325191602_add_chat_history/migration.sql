/*
  Warnings:

  - You are about to drop the `chat_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "chat_history";

-- CreateTable
CREATE TABLE "chat_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_histories_userId_idx" ON "chat_histories"("userId");
