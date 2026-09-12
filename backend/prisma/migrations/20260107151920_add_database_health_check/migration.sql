-- CreateTable
CREATE TABLE "DatabaseHealthCheck" (
    "id" TEXT NOT NULL,
    "database_id" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseHealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatabaseHealthCheck_database_id_created_at_idx" ON "DatabaseHealthCheck"("database_id", "created_at");

-- AddForeignKey
ALTER TABLE "DatabaseHealthCheck" ADD CONSTRAINT "DatabaseHealthCheck_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "Database"("id") ON DELETE CASCADE ON UPDATE CASCADE;
