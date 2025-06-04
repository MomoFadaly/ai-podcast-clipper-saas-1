-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watchTime" INTEGER NOT NULL DEFAULT 0;
