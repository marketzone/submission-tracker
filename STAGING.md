# Staging Environment — Deployment Guide

## Overview

The staging environment is a fully isolated deployment of the submission tracker, running on a separate Neon PostgreSQL database and a separate Vercel deployment. It shares no data with production.

```
Production  → main branch     → Neon production DB
Staging     → staging branch  → Neon staging DB
```

## Environment Variables

| Variable         | Scope                        | Notes                                                   |
|------------------|------------------------------|---------------------------------------------------------|
| `DATABASE_URL`   | Preview / staging branch     | Neon staging connection string                          |
| `DATABASE_URL`   | Production                   | Neon production connection string                       |
| `NEXTAUTH_SECRET`| Production + Preview         | Same secret is fine for both environments               |
| `NEXTAUTH_URL`   | Production                   | https://your-production-domain.vercel.app               |
| `NEXTAUTH_URL`   | Preview / staging branch     | https://your-staging-domain.vercel.app                  |
| `RESEND_API_KEY` | Production + Preview         | Single key — staging email goes to same inbox           |
| `CRON_SECRET`    | Production + Preview         | Arbitrary secret string; used to gate admin endpoints   |

**Important:** `DATABASE_URL` must be scoped specifically to the `staging` branch under Preview — not to all preview deployments — or feature branches will accidentally hit the staging DB.

## Migration Strategy

Migrations run automatically on Vercel deploy via the build script:
```
prisma generate && prisma migrate deploy && next build
```

- **Feature branches** → do NOT get the staging `DATABASE_URL` → migrations do NOT run on PR previews
- **Merge to `staging`** → Vercel deploys staging → `prisma migrate deploy` runs against staging DB
- **Merge to `main`** → Vercel deploys production → `prisma migrate deploy` runs against production DB

### Manual migration check (Neon console)
If you need to verify a migration ran, open the Neon staging project → SQL Editor and run:
```sql
SELECT migration_name, finished_at
FROM "_prisma_migrations"
ORDER BY finished_at DESC
LIMIT 10;
```

## AI Reviewer Data Foundation — Brief #1 (feature/ai-review-schema)

### What this branch adds

1. **`prisma/migrations/20260527200000_add_ai_review_fields/`**  
   Adds `AiReviewStatus` enum + 6 AI review columns to `Submission`. Existing rows default to `PENDING`. No data is modified.

2. **`prisma/migrations/20260527210000_add_week_criteria_table/`**  
   Creates the `week_criteria` table (rubric patterns for the AI reviewer). Empty until seeded.

3. **`prisma/seed.ts`**  
   Seeds 16 rows into `week_criteria`. Safe to re-run (deleteMany + createMany).

### Deployment order for this branch

```
1. Merge feature/ai-review-schema → staging
2. Vercel runs:  prisma migrate deploy  (both migrations apply)
                 next build
3. Call seed endpoint to populate week_criteria (step 4 below)
4. Call spot-check endpoint to verify student fields (step 5 below)
```

### Seeding week_criteria on staging

Once merged and deployed, call the seed endpoint once:

```bash
curl -X POST https://<staging-domain>/api/admin/seed-week-criteria \
  -H "x-cron-secret: <CRON_SECRET>"
```

Expected response:
```json
{
  "ok": true,
  "rowsSeeded": 16,
  "expectedRows": 16,
  "aidaSpotCheck": {
    "id": "wc_w2_free_aida",
    "weekNumber": 2,
    "launchStrategy": "free_event",
    "templateVariant": "aida"
  }
}
```

The endpoint is idempotent — calling it again will re-seed safely (deletes and re-creates all 16 rows).

### Spot-checking student fields

```bash
curl https://<staging-domain>/api/admin/spot-check \
  -H "x-cron-secret: <CRON_SECRET>"
```

This returns the 5 most recently created students with their `launchStrategy`, `launchPricing`, `launchEventTopic`, `niche`, and `launchInfoStatus` field values. Use this to confirm the fields exist and have expected values on staging students.

### Confirming no submission data was modified

The two migrations only:
- Add new columns to `Submission` (no UPDATE, no DELETE)
- Create a new table (`week_criteria`)

To verify on staging (Neon SQL Editor):
```sql
-- Should return 'PENDING' for all existing rows
SELECT DISTINCT "aiReviewStatus" FROM "Submission";

-- All AI fields should be null on pre-existing rows
SELECT COUNT(*) FROM "Submission"
WHERE "aiNicheAlignment" IS NOT NULL
   OR "aiTriageVerdict" IS NOT NULL
   OR "aiFeedback" IS NOT NULL
   OR "aiReviewedAt" IS NOT NULL;
-- Expected: 0
```

## PII / Logging Constraints

- No submission text, student names, or email addresses must appear in server logs or error messages
- Admin endpoints return only metadata (IDs, field presence booleans) — not raw content
- All future Brief implementations must follow the same rule: log field names / status values, never field contents
