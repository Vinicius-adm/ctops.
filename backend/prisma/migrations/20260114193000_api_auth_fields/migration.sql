-- Add auth fields to API (token/headers per API)
ALTER TABLE "API"
  ADD COLUMN IF NOT EXISTS "auth_type" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "auth_header_name" TEXT NOT NULL DEFAULT 'Authorization',
  ADD COLUMN IF NOT EXISTS "auth_token" TEXT,
  ADD COLUMN IF NOT EXISTS "headers_json" TEXT;

CREATE INDEX IF NOT EXISTS "API_auth_type_idx" ON "API" ("auth_type");
