-- AlterTable
ALTER TABLE "CompanyRequest" ADD COLUMN     "normalizedCommuneId" TEXT,
ADD COLUMN     "normalizedRegionCode" TEXT;

-- CreateIndex
CREATE INDEX "CompanyRequest_normalizedCommuneId_idx" ON "CompanyRequest"("normalizedCommuneId");

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_normalizedCommuneId_fkey" FOREIGN KEY ("normalizedCommuneId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
