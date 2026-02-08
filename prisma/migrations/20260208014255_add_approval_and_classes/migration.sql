-- CreateEnum
CREATE TYPE "StudentClass" AS ENUM ('PRE_CLARITY', 'STRATEGY_CLASS', 'FUNNEL_CLASS', 'LAUNCH_CLASS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studentClass" "StudentClass";
