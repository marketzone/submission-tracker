-- AlterTable: add studentNote and returnedByHeadCoach to Submission
ALTER TABLE "Submission" ADD COLUMN "studentNote" TEXT;
ALTER TABLE "Submission" ADD COLUMN "returnedByHeadCoach" BOOLEAN NOT NULL DEFAULT false;
