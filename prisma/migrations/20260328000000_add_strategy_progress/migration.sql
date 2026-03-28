-- CreateEnum
CREATE TYPE "StrategyAction" AS ENUM ('CANVA_SUBMITTED', 'POST_APPROVED', 'AD_SETUP_PENDING', 'METRICS_READ');

-- CreateTable
CREATE TABLE "StrategyProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "action" "StrategyAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrategyProgress_studentId_key" ON "StrategyProgress"("studentId");

-- CreateIndex
CREATE INDEX "StrategyProgress_studentId_idx" ON "StrategyProgress"("studentId");

-- AddForeignKey
ALTER TABLE "StrategyProgress" ADD CONSTRAINT "StrategyProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
