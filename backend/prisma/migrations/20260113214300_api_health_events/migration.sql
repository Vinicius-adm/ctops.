-- CreateTable
CREATE TABLE "APIHealthEvent" (
    "id" TEXT NOT NULL,
    "api_id" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "status" INTEGER,
    "latency_ms" INTEGER NOT NULL,
    "error" TEXT,

    CONSTRAINT "APIHealthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "APIHealthEvent_api_id_checked_at_idx" ON "APIHealthEvent"("api_id", "checked_at");

-- CreateIndex
CREATE INDEX "APIHealthEvent_ok_idx" ON "APIHealthEvent"("ok");

-- AddForeignKey
ALTER TABLE "APIHealthEvent" ADD CONSTRAINT "APIHealthEvent_api_id_fkey" FOREIGN KEY ("api_id") REFERENCES "API"("id") ON DELETE CASCADE ON UPDATE CASCADE;
