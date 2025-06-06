import { env } from "~/env";
import { inngest } from "./client";
import { db } from "~/server/db";
import { type Prisma } from "@prisma/client";

// Type for backend processor result
interface ProcessorResult {
  success: boolean;
  video_info?: {
    duration?: number;
    title?: string;
    thumbnail_url?: string; // Assuming backend might provide this for the original video
  };
  chunks?: Array<{
    chunk_number: number;
    start_time_seconds: number;
    end_time_seconds: number;
    duration_seconds: number;
    // s3_key is NOT expected per chunk for virtual chunking
    // transcription per chunk is also not expected if we use full transcript
  }>;
  transcript?: Array<{ start: number; end: number; word: string }>; // Expect this to be the full transcript array
  original_s3_key?: string; // Expect this for the main video S3 key
  total_chunks?: number;
  error?: string;
}

function isProcessorResult(obj: unknown): obj is ProcessorResult {
  if (
    typeof obj === "object" &&
    obj !== null &&
    Object.prototype.hasOwnProperty.call(obj, "success")
  ) {
    const value = (obj as { success?: unknown }).success;
    return typeof value === "boolean";
  }
  return false;
}

// All chunkwise/virtual chunking processing uses env.PROCESS_VIDEO_ENDPOINT
// Endpoint: https://momofadaly--chunkwise-processor-chunkwiseprocessor-proce-22c141.modal.run

// Chunkwise video processing function
export const processChunkwiseVideo = inngest.createFunction(
  {
    id: "process-chunkwise-video",
    retries: 2,
    concurrency: {
      limit: 2, // Process 2 videos at once max
      key: "event.data.userId",
    },
  },
  { event: "process-video-events" },
  async ({ event, step }) => {
    const {
      uploadedFileId: videoId,
      userId,
      youtubeUrl,
      s3Key, // This is the s3Key of the uploaded file, which becomes original_s3_key from backend
      chunks,
    } = event.data as {
      uploadedFileId: string;
      userId: string;
      youtubeUrl?: string;
      s3Key?: string;
      chunks: Record<string, unknown>[];
    };

    console.log("🚀 === INNGEST FUNCTION TRIGGERED ===");
    console.log("Event data:", JSON.stringify(event.data, null, 2));
    console.log(`Processing video: ${videoId} for user: ${userId}`);
    console.log(`🔍 DEBUG: S3 Key (from event):`, s3Key);
    console.log(`🔍 DEBUG: YouTube URL:`, youtubeUrl);

    try {
      // Step 1: Check user subscription limits (business rule)
      const { canProcess, videoLimitReached } = await step.run(
        "check-subscription-limits",
        async () => {
          // Check user's credits and recent processing activity
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { credits: true },
          });

          if (!user || user.credits <= 0) {
            return {
              canProcess: false,
              videoLimitReached: true,
            };
          }

          // For now, allow processing if user has credits
          // TODO: Implement more sophisticated subscription logic
          return {
            canProcess: true,
            videoLimitReached: false,
          };
        },
      );

      if (!canProcess || videoLimitReached) {
        await step.run("update-video-status-limit-reached", async () => {
          await db.uploadedFile.update({
            where: { id: videoId },
            data: { status: "limit_reached" },
          });
          console.log(
            `Video ${videoId} processing blocked: subscription limit reached`,
          );
        });
        return { success: false, reason: "subscription_limit_reached" };
      }

      // Step 2: Update video status to processing (business rule)
      await step.run("set-status-processing", async () => {
        await db.uploadedFile.update({
          where: { id: videoId },
          data: { status: "processing" },
        });
        console.log(`Setting video ${videoId} status to processing`);
      });

      // Step 3: Call backend processor
      const processingResult = await step.run(
        "call-chunkwise-processor",
        async (): Promise<ProcessorResult> => {
          const authToken = env.PROCESS_VIDEO_ENDPOINT_AUTH;
          if (!authToken) {
            throw new Error(
              "PROCESS_VIDEO_ENDPOINT_AUTH environment variable is not set",
            );
          }
          const payload: Record<string, unknown> = {
            video_id: videoId,
            chunks: chunks,
          };
          if (s3Key) payload.s3_key = s3Key;
          if (youtubeUrl) payload.youtube_url = youtubeUrl;

          const response = await fetch(env.PROCESS_VIDEO_ENDPOINT, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          });

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => "Unknown error from backend");
            console.error("[Inngest] Backend processor fetch failed:", {
              endpoint: env.PROCESS_VIDEO_ENDPOINT,
              payload,
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText,
            });
            throw new Error(
              `Backend processing failed: ${response.status} - ${errorText}`,
            );
          }

          const resultRaw: unknown = await response.json();
          if (!isProcessorResult(resultRaw)) {
            console.error(
              "[Inngest] Unexpected backend result format:",
              resultRaw,
            );
            throw new Error(
              "Backend processor returned unexpected result format",
            );
          }
          console.log("Backend raw result:", resultRaw);
          return resultRaw;
        },
      );

      if (!processingResult.success) {
        console.error("❌ Backend processing failed:", processingResult.error);
        throw new Error(
          `Backend processing error: ${processingResult.error ?? "Unknown error"}`,
        );
      }
      console.log("✅ Backend processing succeeded");

      const originalS3KeyFromBackend = processingResult.original_s3_key;
      if (!originalS3KeyFromBackend) {
        console.error("❌ Critical: Backend did not return original_s3_key!");
        throw new Error(
          "Backend did not provide original_s3_key after processing.",
        );
      }

      // Step 4: Update database with processing results
      const { chunksCreated } = await step.run(
        "save-chunks-to-database",
        async () => {
          const videoInfo = processingResult.video_info;
          const backendChunks = Array.isArray(processingResult.chunks)
            ? processingResult.chunks
            : [];

          const fullTranscriptArray: Array<{
            start: number;
            end: number;
            word: string;
          }> = Array.isArray(processingResult.transcript)
            ? processingResult.transcript
            : [];

          console.log(`Saving video metadata for ${videoId}:`, videoInfo);
          console.log(
            `Backend returned ${backendChunks.length} chunk definitions.`,
          );
          console.log(
            `Full transcript has ${fullTranscriptArray.length} word segments.`,
          );

          // Update the uploaded file with basic info
          await db.uploadedFile.update({
            where: { id: videoId },
            data: {
              s3Key: originalS3KeyFromBackend,
              displayName: videoInfo?.title ?? undefined,
            },
          });

          // Update transcript and duration using raw SQL to bypass TypeScript issues
          if (fullTranscriptArray.length > 0 || videoInfo?.duration) {
            await db.$executeRaw`
              UPDATE "UploadedFile"
              SET transcript = ${fullTranscriptArray.length > 0 ? JSON.stringify(fullTranscriptArray) : null}::jsonb,
                  duration = ${videoInfo?.duration ? Math.round(videoInfo.duration) : null}
              WHERE id = ${videoId}
            `;
            console.log(`Updated transcript and duration for video ${videoId}`);
          }

          // Delete any existing clips for this video before creating new ones
          await db.clip.deleteMany({
            where: { uploadedFileId: videoId },
          });
          console.log(`Deleted existing clips for video ${videoId}`);

          for (const [index, chunkDef] of backendChunks.entries()) {
            const clipId = `${videoId}-chunk-${index}`;
            const clipData = {
              id: clipId,
              s3Key: originalS3KeyFromBackend,
              uploadedFileId: videoId,
              userId: userId,
              isCompleted: true,
              completedAt: new Date(),
              updatedAt: new Date(),
              chunks: chunkDef,
            };
            await db.clip.create({ data: clipData });
            console.log(`✅ Created Clip record: ${clipId}`);
          }
          return { chunksCreated: backendChunks.length };
        },
      );

      // Step 5: Update user's credits/count
      await step.run("increment-monthly-video-count", async () => {
        await db.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        });
        console.log(`Decremented credits for user ${userId}`);
      });

      // Step 6: Generate thumbnails
      await step.run("generate-thumbnails", async () => {
        try {
          console.log(
            `🎬 Starting thumbnail generation for project ${videoId}...`,
          );

          // Type the module import explicitly
          const thumbnailModule = (await import("~/actions/thumbnails")) as {
            generateProjectAndClipThumbnailsServerSide: (
              projectId: string,
            ) => Promise<{
              success: boolean;
              error?: string;
              results?: Array<unknown>;
            }>;
          };

          const thumbnailResult =
            await thumbnailModule.generateProjectAndClipThumbnailsServerSide(
              videoId,
            );

          if (thumbnailResult.success) {
            console.log(
              `✅ Thumbnails generated successfully for project ${videoId}`,
            );
          } else {
            console.log(
              `⚠️ Thumbnail generation had issues: ${thumbnailResult.error}`,
            );
          }
          return thumbnailResult;
        } catch (error) {
          console.error(
            `❌ Thumbnail generation failed for project ${videoId}:`,
            error,
          );
          return { success: false, error: String(error) };
        }
      });

      // Step 7: Set final status
      await step.run("set-status-completed", async () => {
        await db.uploadedFile.update({
          where: { id: videoId },
          data: { status: "completed" },
        });
        console.log(`Video ${videoId} processing completed successfully`);
      });

      return {
        success: true,
        videoId,
        chunksCreated,
        totalChunks: processingResult.total_chunks,
      };
    } catch (error) {
      console.error(`❌ Error processing video ${videoId}:`, error);
      console.error(
        `❌ Error stack:`,
        error instanceof Error ? error.stack : "No stack trace",
      );

      await step.run("set-status-failed", async () => {
        await db.uploadedFile.update({
          where: { id: videoId },
          data: { status: "failed" },
        });
        console.log(
          `❌ Setting video ${videoId} status to failed due to error:`,
          error,
        );
      });

      throw error;
    }
  },
);

// Function to handle failed video processing retries
export const retryFailedVideo = inngest.createFunction(
  {
    id: "retry-failed-chunkwise-video",
    retries: 1, // Consider increasing retries or adding a dead-letter queue
  },
  { event: "chunkwise.retry-video" },
  async ({ event, step }) => {
    const { videoId, userId, youtubeUrl, s3Key, chunkConfig } = event.data as {
      videoId: string;
      userId: string;
      youtubeUrl?: string;
      s3Key?: string;
      chunkConfig?: Record<string, unknown>;
    };

    console.log(`Retrying video ${videoId} processing for user ${userId}`);

    const retryChunkConfig = chunkConfig ?? {
      method: "minutes",
      minutesPerChunk: 5,
      totalChunks: 1,
    };

    await step.run("reset-video-status-for-retry", async () => {
      await db.uploadedFile.update({
        where: { id: videoId },
        data: { status: "queued" },
      });
      console.log(`Video ${videoId} status reset to queued for retry.`);
    });

    await step.sendEvent("trigger-retry-processing", {
      name: "process-video-events",
      data: {
        uploadedFileId: videoId,
        userId,
        youtubeUrl,
        s3Key,
        chunks: [], // Reset chunks for retry
      },
    });

    return { success: true, videoId, action: "retry_triggered_with_new_event" };
  },
);

// Function to clean up failed/cancelled video processing
export const cleanupVideo = inngest.createFunction(
  {
    id: "cleanup-chunkwise-video",
    retries: 1,
  },
  { event: "chunkwise.cleanup-video" },
  async ({ event, step }) => {
    const { videoId } = event.data as { videoId: string };

    const cleanupResult = await step.run("cleanup-s3-files", async () => {
      try {
        // TODO: Implement S3 cleanup for the original video file and its thumbnails
        // The original video S3 key can be fetched from UploadedFile table
        console.log(
          `Placeholder for S3 cleanup for video ${videoId}. Original video and its thumbnails.`,
        );
        return { success: true, filesDeleted: 0 }; // Placeholder
      } catch (error) {
        console.error("Error cleaning up S3 files:", error);
        return { success: false, error: String(error) };
      }
    });

    await step.run("cleanup-database-records", async () => {
      // Delete clips and then the main UploadedFile record
      await db.clip.deleteMany({ where: { uploadedFileId: videoId } });
      await db.uploadedFile.delete({ where: { id: videoId } });
      console.log(
        `Cleaned up database records (clips and uploadedFile) for video ${videoId}`,
      );
    });

    return {
      success: cleanupResult.success,
      videoId,
      filesDeleted:
        "filesDeleted" in cleanupResult &&
        typeof cleanupResult.filesDeleted === "number"
          ? cleanupResult.filesDeleted
          : 0,
    };
  },
);
