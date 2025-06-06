/*
  Warnings:

  - A unique constraint covering the columns `[s3Key]` on the table `Clip` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "chunks" JSONB,
ADD COLUMN     "transcript" JSONB;

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "duration" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Clip_s3Key_key" ON "Clip"("s3Key");
