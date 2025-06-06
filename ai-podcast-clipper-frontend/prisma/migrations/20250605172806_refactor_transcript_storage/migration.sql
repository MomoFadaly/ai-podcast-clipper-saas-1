/*
  Warnings:

  - You are about to drop the column `transcript` on the `Clip` table. All the data in the column will be lost.
  - You are about to drop the column `transcription` on the `Clip` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Clip" DROP COLUMN "transcript",
DROP COLUMN "transcription";

-- AlterTable
ALTER TABLE "UploadedFile" ADD COLUMN     "transcript" JSONB;
