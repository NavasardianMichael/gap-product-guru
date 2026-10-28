-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('helpful', 'incorrect');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "area" TEXT NOT NULL DEFAULT '';

-- Backfill: same rule as getDocArea() in src/lib/docAreas.ts (first path segment without `.md`),
-- so already-ingested documents get an area without a re-ingest.
UPDATE "documents" SET "area" = regexp_replace(split_part("path", '/', 1), '\.md$', '', 'i');

-- CreateTable
CREATE TABLE "message_feedback" (
    "id" TEXT NOT NULL,
    "message_id" TEXT,
    "client_id" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "note" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_conversations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_feedback_rating_resolved_at_created_at_idx" ON "message_feedback"("rating", "resolved_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_feedback_message_id_client_id_key" ON "message_feedback"("message_id", "client_id");

-- CreateIndex
CREATE INDEX "documents_area_idx" ON "documents"("area");

-- AddForeignKey
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
