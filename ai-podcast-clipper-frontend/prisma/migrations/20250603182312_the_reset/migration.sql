-- CreateIndex
CREATE INDEX "Clip_createdAt_idx" ON "Clip"("createdAt");

-- CreateIndex
CREATE INDEX "Clip_isCompleted_idx" ON "Clip"("isCompleted");

-- CreateIndex
CREATE INDEX "Clip_uploadedFileId_idx" ON "Clip"("uploadedFileId");

-- CreateIndex
CREATE INDEX "Clip_uploadedFileId_userId_idx" ON "Clip"("uploadedFileId", "userId");

-- CreateIndex
CREATE INDEX "Clip_userId_idx" ON "Clip"("userId");

-- CreateIndex
CREATE INDEX "UploadedFile_createdAt_idx" ON "UploadedFile"("createdAt");

-- CreateIndex
CREATE INDEX "UploadedFile_status_idx" ON "UploadedFile"("status");

-- CreateIndex
CREATE INDEX "UploadedFile_userId_createdAt_idx" ON "UploadedFile"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UploadedFile_userId_idx" ON "UploadedFile"("userId");

-- CreateIndex
CREATE INDEX "UploadedFile_userId_status_idx" ON "UploadedFile"("userId", "status");
