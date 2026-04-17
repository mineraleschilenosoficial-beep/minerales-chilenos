/*
  Warnings:

  - Made the column `communeId` on table `CompanyRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CompanyRequest" DROP CONSTRAINT "CompanyRequest_communeId_fkey";

-- AlterTable
ALTER TABLE "CompanyRequest" ALTER COLUMN "communeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
