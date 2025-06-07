-- AlterTable
ALTER TABLE "ProjectTrack" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ProjectTrack_trackId_order_idx" ON "ProjectTrack"("trackId", "order");
