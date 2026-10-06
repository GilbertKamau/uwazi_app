-- Indexes for the filterable public report feed and comment lookups.
-- Safe to run against an existing database.

CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");
CREATE INDEX IF NOT EXISTS "reports_category_idx" ON "reports"("category");
CREATE INDEX IF NOT EXISTS "reports_county_idx" ON "reports"("county");
CREATE INDEX IF NOT EXISTS "reports_createdAt_idx" ON "reports"("createdAt");
CREATE INDEX IF NOT EXISTS "reports_authorId_idx" ON "reports"("authorId");

CREATE INDEX IF NOT EXISTS "comments_reportId_idx" ON "comments"("reportId");
CREATE INDEX IF NOT EXISTS "comments_authorId_idx" ON "comments"("authorId");
