-- CreateTable
CREATE TABLE "review_edits" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "deliverableName" TEXT NOT NULL,
    "templateVariant" TEXT,
    "reviewModelVersion" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "aiValue" TEXT NOT NULL,
    "humanValue" TEXT NOT NULL,
    "aiVerdict" TEXT NOT NULL,
    "finalVerdict" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_edits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_edits_submissionId_idx" ON "review_edits"("submissionId");

-- CreateIndex
CREATE INDEX "review_edits_weekNumber_fieldName_idx" ON "review_edits"("weekNumber","fieldName");

-- CreateIndex
CREATE INDEX "review_edits_aiVerdict_finalVerdict_idx" ON "review_edits"("aiVerdict","finalVerdict");

-- CreateIndex
CREATE INDEX "review_edits_weekNumber_templateVariant_idx" ON "review_edits"("weekNumber","templateVariant");

-- AddForeignKey
ALTER TABLE "review_edits" ADD CONSTRAINT "review_edits_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
