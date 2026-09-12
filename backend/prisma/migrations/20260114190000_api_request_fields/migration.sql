-- Add request configuration fields to API
ALTER TABLE "API"
  ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'GET',
  ADD COLUMN IF NOT EXISTS "body" TEXT,
  ADD COLUMN IF NOT EXISTS "validation_json_key" TEXT,
  ADD COLUMN IF NOT EXISTS "last_http_status" INTEGER,
  ADD COLUMN IF NOT EXISTS "last_error" TEXT;
