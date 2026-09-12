-- AlterTable
ALTER TABLE "Container" ADD COLUMN     "azure_container_name" TEXT,
ADD COLUMN     "azure_resource_group" TEXT,
ADD COLUMN     "azure_resource_name" TEXT,
ADD COLUMN     "azure_revision_name" TEXT,
ADD COLUMN     "azure_subscription_id" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'docker';

-- CreateIndex
CREATE INDEX "Container_provider_idx" ON "Container"("provider");
