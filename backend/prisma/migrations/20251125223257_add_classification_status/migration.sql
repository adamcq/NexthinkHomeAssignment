-- CreateEnum
CREATE TYPE "ClassificationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "classificationStatus" "ClassificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Article_classificationStatus_idx" ON "Article"("classificationStatus");
