-- Migration: add AI review fields to Submission
-- These columns run in parallel with the existing manual-review fields and
-- never modify or replace them. Existing rows safely default to PENDING / NULL.

-- Create the AiReviewStatus enum
CREATE TYPE "AiReviewStatus" AS ENUM ('PENDING', 'AUTO_APPROVED', 'HELD_FOR_HUMAN', 'HUMAN_REVIEWED');

-- Add AI review columns to Submission
-- aiReviewStatus: defaults to PENDING so all existing rows are correctly
--   marked as "not yet reviewed by AI" without any ambiguous state.
ALTER TABLE "Submission" ADD COLUMN "aiReviewStatus"     "AiReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Submission" ADD COLUMN "aiNicheAlignment"   TEXT;
ALTER TABLE "Submission" ADD COLUMN "aiFeedback"         JSONB;
ALTER TABLE "Submission" ADD COLUMN "aiTriageVerdict"    TEXT;
ALTER TABLE "Submission" ADD COLUMN "aiReviewedAt"       TIMESTAMP(3);
ALTER TABLE "Submission" ADD COLUMN "reviewModelVersion" TEXT;

-- Index for querying submissions by AI review status (human review queue)
CREATE INDEX "Submission_aiReviewStatus_idx" ON "Submission"("aiReviewStatus");
