-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "registry" TEXT,
    "host" TEXT,
    "status" TEXT,
    "restarts" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3),
    "polling_interval_seconds" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContainerCredential" (
    "id" TEXT NOT NULL,
    "container_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "username" TEXT,
    "token_encrypted" TEXT NOT NULL,
    "tls_cert" TEXT,
    "tls_key" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainerCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContainerLog" (
    "id" TEXT NOT NULL,
    "container_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "ContainerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Container_owner_user_id_idx" ON "Container"("owner_user_id");

-- CreateIndex
CREATE INDEX "Container_status_idx" ON "Container"("status");

-- CreateIndex
CREATE INDEX "ContainerCredential_container_id_idx" ON "ContainerCredential"("container_id");

-- CreateIndex
CREATE INDEX "ContainerLog_container_id_idx" ON "ContainerLog"("container_id");

-- CreateIndex
CREATE INDEX "ContainerLog_timestamp_idx" ON "ContainerLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerCredential" ADD CONSTRAINT "ContainerCredential_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerLog" ADD CONSTRAINT "ContainerLog_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "Container"("id") ON DELETE CASCADE ON UPDATE CASCADE;
