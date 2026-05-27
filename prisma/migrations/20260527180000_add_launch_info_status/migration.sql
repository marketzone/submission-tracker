-- AlterTable: add launch info review status and feedback fields to User
ALTER TABLE "User" ADD COLUMN "launchInfoStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "launchInfoFeedback" TEXT;
