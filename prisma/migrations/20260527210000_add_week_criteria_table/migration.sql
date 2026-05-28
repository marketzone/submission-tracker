-- Migration: create week_criteria table
-- Static lookup table holding the AI reviewer rubric patterns.
-- Populated via `npx prisma db seed` after this migration runs.
-- launch_strategy NULL means the row applies to all strategies.
-- templatePattern is TEXT (PostgreSQL unlimited length) — patterns are ~3-5KB each.

CREATE TABLE "week_criteria" (
    "id"              TEXT NOT NULL,
    "weekNumber"      INTEGER NOT NULL,
    "launchStrategy"  TEXT,
    "deliverableName" TEXT NOT NULL,
    "templateVariant" TEXT,
    "templatePattern" TEXT NOT NULL,
    "sourceDocUrl"    TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "week_criteria_pkey" PRIMARY KEY ("id")
);

-- Index for the review function's primary lookup path
CREATE INDEX "week_criteria_weekNumber_launchStrategy_idx"
    ON "week_criteria"("weekNumber", "launchStrategy");
