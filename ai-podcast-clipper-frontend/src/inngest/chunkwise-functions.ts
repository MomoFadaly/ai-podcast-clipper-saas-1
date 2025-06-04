import { env } from "~/env";
import { inngest } from "./client";
import { listVideoChunks } from "~/actions/chunkwise-s3";

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
  { event: "chunkwise.process-video" },
  async ({ event, step }) => {
    const { videoId, userId, youtubeUrl, chunkDurationMinutes } =
      event.data as {
        videoId: string;
        userId: string;
        youtubeUrl: string;
        chunkDurationMinutes: number;
      };

    try {
      // Step 1: Check user subscription limits
      const { canProcess, videoLimitReached } = await step.run(
        "check-subscription-limits",
        async () => {
          // TODO: Implement Supabase query to check:
          // - User's monthly video limit
          // - Videos processed this month
          // - Subscription status

          // Placeholder implementation
          return {
            canProcess: true,
            videoLimitReached: false,
          };
        },
      );

      if (!canProcess || videoLimitReached) {
        await step.run("update-video-status-limit-reached", async () => {
          // TODO: Update video status to "limit_reached" in Supabase
          console.log(
            `Video ${videoId} processing blocked: subscription limit reached`,
          );
        });
        return { success: false, reason: "subscription_limit_reached" };
      }

      // Step 2: Update video status to processing
      await step.run("set-status-processing", async () => {
        // TODO: Update video status to "processing" in Supabase
        console.log(`Setting video ${videoId} status to processing`);
      });

      // Step 3: Call backend processor
      const processingResult = await step.run(
        "call-chunkwise-processor",
        async () => {
          const response = await fetch(env.CHUNKWISE_PROCESS_VIDEO_ENDPOINT!, {
            method: "POST",
            body: JSON.stringify({
              youtube_url: youtubeUrl,
              video_id: videoId,
              chunk_duration_minutes: chunkDurationMinutes,
            }),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.CHUNKWISE_PROCESS_VIDEO_ENDPOINT_AUTH}`, // New auth token
            },
          });

          if (!response.ok) {
            throw new Error(`Backend processing failed: ${response.status}`);
          }

          return await response.json();
        },
      );

      if (!processingResult.success) {
        throw new Error(`Backend processing error: ${processingResult.error}`);
      }

      // Step 4: Update database with processing results
      const { chunksCreated } = await step.run(
        "save-chunks-to-database",
        async () => {
          // TODO: Implement Supabase operations:
          // 1. Update video table with metadata (title, duration, s3_video_path, etc.)
          // 2. Create chunk records in chunks table
          // 3. Update processing progress

          const videoInfo = processingResult.video_info;
          const chunks = processingResult.chunks;

          console.log(`Saving video metadata for ${videoId}:`, videoInfo);
          console.log(`Creating ${chunks.length} chunk records`);

          // Placeholder - replace with actual Supabase calls
          return {
            chunksCreated: chunks.length,
          };
        },
      );

      // Step 5: Update user's monthly video count
      await step.run("increment-monthly-video-count", async () => {
        // TODO: Increment user's videos_processed_this_month in Supabase
        console.log(`Incrementing monthly video count for user ${userId}`);
      });

      // Step 6: Set final status
      await step.run("set-status-completed", async () => {
        // TODO: Update video status to "completed" in Supabase
        console.log(`Video ${videoId} processing completed successfully`);
      });

      return {
        success: true,
        videoId,
        chunksCreated,
        totalChunks: processingResult.total_chunks,
      };
    } catch (error) {
      console.error(`Error processing video ${videoId}:`, error);

      // Handle error - update video status to failed
      await step.run("set-status-failed", async () => {
        // TODO: Update video status to "failed" in Supabase with error message
        console.log(`Setting video ${videoId} status to failed:`, error);
      });

      return {
        success: false,
        videoId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

// Function to check chunk processing progress
export const checkChunkProgress = inngest.createFunction(
  {
    id: "check-chunk-progress",
    retries: 1,
  },
  { event: "chunkwise.check-progress" },
  async ({ event, step }) => {
    const { videoId } = event.data as { videoId: string };

    const progress = await step.run("check-s3-chunks", async () => {
      try {
        const { success, chunks } = await listVideoChunks(videoId);

        if (!success) {
          return { progress: 0, chunksFound: 0 };
        }

        // TODO: Compare with expected chunks from database
        // and calculate actual progress percentage

        return {
          progress: chunks.length > 0 ? 100 : 0, // Simplified
          chunksFound: chunks.length,
          chunks: chunks,
        };
      } catch (error) {
        console.error("Error checking chunk progress:", error);
        return { progress: 0, chunksFound: 0, error: String(error) };
      }
    });

    return progress;
  },
);

// Function to handle failed video processing retries
export const retryFailedVideo = inngest.createFunction(
  {
    id: "retry-failed-chunkwise-video",
    retries: 1,
  },
  { event: "chunkwise.retry-video" },
  async ({ event, step }) => {
    const { videoId, userId, youtubeUrl, chunkDurationMinutes } =
      event.data as {
        videoId: string;
        userId: string;
        youtubeUrl: string;
        chunkDurationMinutes: number;
      };

    // Reset video status and retry processing
    await step.run("reset-video-status", async () => {
      // TODO: Reset video status to "processing" in Supabase
      console.log(`Retrying video ${videoId} processing`);
    });

    // Trigger the main processing function
    await step.sendEvent("trigger-retry", {
      name: "chunkwise.process-video",
      data: {
        videoId,
        userId,
        youtubeUrl,
        chunkDurationMinutes,
      },
    });

    return { success: true, videoId, action: "retry_triggered" };
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
        // TODO: Implement S3 cleanup for video files
        // - Delete original video: chunkwise/videos/{videoId}/original.mp4
        // - Delete all chunks: chunkwise/videos/{videoId}/chunks/*
        // - Delete thumbnails: chunkwise/videos/{videoId}/thumbnails/*

        console.log(`Cleaning up S3 files for video ${videoId}`);

        return { success: true, filesDeleted: 0 }; // Placeholder
      } catch (error) {
        console.error("Error cleaning up S3 files:", error);
        return { success: false, error: String(error) };
      }
    });

    await step.run("cleanup-database-records", async () => {
      // TODO: Delete video and related chunk records from Supabase
      console.log(`Cleaning up database records for video ${videoId}`);
    });

    return {
      success: cleanupResult.success,
      videoId,
      filesDeleted:
        "filesDeleted" in cleanupResult ? cleanupResult.filesDeleted : 0,
    };
  },
);
