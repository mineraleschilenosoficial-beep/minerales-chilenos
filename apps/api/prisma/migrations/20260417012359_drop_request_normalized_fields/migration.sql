/*
  Warnings:

  - You are about to drop the column `normalizedCommuneId` on the `CompanyRequest` table. All the data in the column will be lost.
  - You are about to drop the column `normalizedRegionCode` on the `CompanyRequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CompanyRequest" DROP CONSTRAINT "CompanyRequest_normalizedCommuneId_fkey";

-- DropIndex
DROP INDEX "CompanyRequest_normalizedCommuneId_idx";

-- AlterTable
ALTER TABLE "CompanyRequest" DROP COLUMN "normalizedCommuneId",
DROP COLUMN "normalizedRegionCode";
