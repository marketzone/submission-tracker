-- AlterTable: add launch pricing fields and approved event title to User
ALTER TABLE "User" ADD COLUMN "launchPricing" TEXT;
ALTER TABLE "User" ADD COLUMN "launchPrice" TEXT;
ALTER TABLE "User" ADD COLUMN "approvedEventTitle" TEXT;
