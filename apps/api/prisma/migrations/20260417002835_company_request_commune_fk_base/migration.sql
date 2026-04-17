-- AlterTable
ALTER TABLE "CompanyRequest" ADD COLUMN     "communeId" TEXT;

-- CreateIndex
CREATE INDEX "CompanyRequest_communeId_idx" ON "CompanyRequest"("communeId");

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
