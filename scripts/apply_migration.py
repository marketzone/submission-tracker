"""
Apply the review_edits migration to the staging database.
Also registers the migration in _prisma_migrations so Prisma tracks it.
"""
import os
import hashlib
import psycopg2
import datetime

DB_URL = os.environ.get("DATABASE_URL", "")

MIGRATION_NAME = "20260528000000_add_review_edits_table"

MIGRATION_SQL = """
CREATE TABLE IF NOT EXISTS "review_edits" (
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

CREATE INDEX IF NOT EXISTS "review_edits_submissionId_idx" ON "review_edits"("submissionId");
CREATE INDEX IF NOT EXISTS "review_edits_weekNumber_fieldName_idx" ON "review_edits"("weekNumber","fieldName");
CREATE INDEX IF NOT EXISTS "review_edits_aiVerdict_finalVerdict_idx" ON "review_edits"("aiVerdict","finalVerdict");
CREATE INDEX IF NOT EXISTS "review_edits_weekNumber_templateVariant_idx" ON "review_edits"("weekNumber","templateVariant");
"""

ADD_FK_SQL = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'review_edits_submissionId_fkey'
    ) THEN
        ALTER TABLE "review_edits"
        ADD CONSTRAINT "review_edits_submissionId_fkey"
        FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
"""

def parse_db_url(url):
    # postgresql://user:pass@host/dbname?params
    from urllib.parse import urlparse, parse_qs
    p = urlparse(url)
    return {
        "host": p.hostname,
        "port": p.port or 5432,
        "dbname": p.path.lstrip("/").split("?")[0],
        "user": p.username,
        "password": p.password,
        "sslmode": parse_qs(p.query).get("sslmode", ["require"])[0],
    }

def main():
    params = parse_db_url(DB_URL)
    conn = psycopg2.connect(**params)
    conn.autocommit = False
    cur = conn.cursor()

    # Check if migration already applied
    cur.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
        )
    """)
    prisma_table_exists = cur.fetchone()[0]

    if prisma_table_exists:
        cur.execute("SELECT id FROM _prisma_migrations WHERE migration_name = %s", (MIGRATION_NAME,))
        already = cur.fetchone()
        if already:
            print(f"Migration {MIGRATION_NAME} already applied — skipping.")
            conn.close()
            return

    print(f"Applying migration: {MIGRATION_NAME}")

    # Apply the migration SQL
    cur.execute(MIGRATION_SQL)
    cur.execute(ADD_FK_SQL)

    # Register in _prisma_migrations if table exists
    if prisma_table_exists:
        # Prisma checksum column is varchar(64) — use bare sha256 hex (64 chars)
        checksum = hashlib.sha256(MIGRATION_SQL.encode()).hexdigest()
        cur.execute("""
            INSERT INTO _prisma_migrations
                (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
            VALUES
                (gen_random_uuid()::text, %s, NOW(), %s, NULL, NULL, NOW(), 1)
        """, (checksum, MIGRATION_NAME))

    conn.commit()
    print("Migration applied successfully.")

    # Verify table exists
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'review_edits' ORDER BY ordinal_position")
    cols = [r[0] for r in cur.fetchall()]
    print(f"review_edits columns: {cols}")

    conn.close()

if __name__ == "__main__":
    main()
