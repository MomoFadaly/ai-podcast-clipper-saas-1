"use server";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";
// Use the existing S3 utilities that are already working
import { getVideoDownloadUrl, uploadToS3 } from "./chunkwise-s3";

export interface ThumbnailGenerationOptions {
  projectId?: string;
  clipId?: string;
  videoS3Key: string;
  timeOffset?: number; // Time in seconds for frame extraction
}

// Helper to construct the thumbnail backend URL from the main processing endpoint
function getThumbnailBackendUrl(): string {
  if (!env.PROCESS_VIDEO_ENDPOINT) {
    console.error("❌ MISSING: PROCESS_VIDEO_ENDPOINT is not configured.");
    throw new Error("Main video processing endpoint not configured");
  }
  // Assuming PROCESS_VIDEO_ENDPOINT is the base URL of the Modal app service
  // and /generate_thumbnail is the specific path for thumbnails.
  // If PROCESS_VIDEO_ENDPOINT already includes a path, this logic might need adjustment.
  // For now, let's assume it's a base URL like https://your-modal-app.modal.run
  // and we need to append /generate_thumbnail
  const baseUrl = env.PROCESS_VIDEO_ENDPOINT.replace(/\/*$/, ""); // Remove trailing slashes if any
  return `${baseUrl}/generate_thumbnail`;
}

// --- Core Internal Thumbnail Generation Logic --- 
interface InternalThumbnailParams {
  videoUrl: string; // Actual downloadable URL for the video
  timeOffset: number;
  authToken: string | null; // Auth token for the backend service, null if not needed
}

async function _fetchThumbnailFromBackend(
  params: InternalThumbnailParams,
): Promise<Buffer> {
  const thumbnailBackendUrl = getThumbnailBackendUrl();
  console.log(
    `  📞 Calling backend for thumbnail: ${thumbnailBackendUrl} at offset ${params.timeOffset}s`,
  );

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (params.authToken) {
    headers.Authorization = `Bearer ${params.authToken}`;
  }

  const response = await fetch(thumbnailBackendUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      video_url: params.videoUrl,
      time_offset: params.timeOffset,
      // width, height, output_format can be defaulted by the backend or made params here
    }),
  });

  console.log(`  ↪️ Backend response status: ${response.status}`);
  if (!response.ok) {
    const errorText = await response
      .text()
      .catch(() => "Failed to get error text");
    console.error("❌ Backend thumbnail generation failed:", errorText);
    throw new Error(
      `Backend thumbnail generation failed: ${response.status} - ${errorText}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

interface ProcessedThumbnailResult {
  thumbnailUrl: string;
  s3Key: string;
}

async function _processAndStoreThumbnail(
  targetId: string, // projectId or clipId
  idType: "project" | "clip",
  originalVideoS3Key: string, // Used to get download URL for backend processing
  timeOffset: number,
  authToken: string | null, // For calling the backend service
): Promise<ProcessedThumbnailResult> {
  console.log(
    `⚙️ _processAndStoreThumbnail for ${idType} '${targetId}' from video '${originalVideoS3Key}' at ${timeOffset}s`,
  );

  const videoDownloadUrlResult = await getVideoDownloadUrl(originalVideoS3Key);
  if (!videoDownloadUrlResult.success || !videoDownloadUrlResult.url) {
    throw new Error(
      `Failed to generate signed URL for ${originalVideoS3Key}: ${videoDownloadUrlResult.error}`,
    );
  }
  console.log(`  ✅ Generated video download URL.`);

  const thumbnailBuffer = await _fetchThumbnailFromBackend({
    videoUrl: videoDownloadUrlResult.url,
    timeOffset,
    authToken,
  });
  console.log(
    `  🖼️ Thumbnail buffer size: ${thumbnailBuffer.byteLength} bytes`,
  );

  const s3SubPath =
    idType === "project"
      ? `thumbnails/projects/${targetId}`
      : `thumbnails/clips/${targetId}`;
  const thumbnailS3Key = `${s3SubPath}/thumbnail_${Date.now()}.jpeg`;

  const uploadResult = await uploadToS3(
    thumbnailS3Key, // This will be prefixed with CHUNKWISE_S3_PREFIX by uploadToS3
    thumbnailBuffer,
    "image/jpeg",
  );
  if (!uploadResult.success || !uploadResult.s3Key) {
    // uploadToS3 returns the full key including prefix
    throw new Error(`S3 upload failed: ${uploadResult.error}`);
  }
  // uploadResult.s3Key already includes the CHUNKWISE_S3_PREFIX, e.g., 'chunkwise/thumbnails/projects/...'
  const finalS3Key = uploadResult.s3Key;
  console.log(`  ☁️ Thumbnail uploaded to S3: ${finalS3Key}`);

  const publicThumbnailUrl = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${finalS3Key}`;
  console.log(`  🔗 Public thumbnail URL: ${publicThumbnailUrl}`);

  if (idType === "project") {
    await db.uploadedFile.update({
      where: { id: targetId },
      data: { thumbnailUrl: publicThumbnailUrl },
    });
  } else {
    await db.clip.update({
      where: { id: targetId },
      data: { thumbnailUrl: publicThumbnailUrl },
    });
  }
  console.log(`  💾 Database updated for ${idType} '${targetId}'.`);
  return { thumbnailUrl: publicThumbnailUrl, s3Key: finalS3Key };
}

// --- Public-Facing and Server-Side Functions ---

// For client-side calls, requires auth session
export async function generateSingleThumbnail(
  options: ThumbnailGenerationOptions,
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  console.log("🎬 generateSingleThumbnail (authed) called with:", options);
  const session = await auth();
  if (!session?.user?.id) {
    console.error(
      "❌ AUTH FAILED: No session or user ID for generateSingleThumbnail",
    );
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;
  console.log("  ✅ AUTH SUCCESS: User ID:", userId);

  const { projectId, clipId, videoS3Key, timeOffset = 10 } = options;

  if (!projectId && !clipId) {
    return { success: false, error: "projectId or clipId is required" };
  }
  if (!videoS3Key) {
    return { success: false, error: "videoS3Key is required" };
  }

  try {
    const targetId = projectId ?? clipId!;
    const idType = projectId ? "project" : "clip";

    // Ensure user owns the project/clip
    if (idType === "project") {
      const project = await db.uploadedFile.findFirst({
        where: { id: targetId, userId },
      });
      if (!project)
        return { success: false, error: "Project not found or access denied" };
    } else {
      const clip = await db.clip.findFirst({ where: { id: targetId, userId } });
      if (!clip)
        return { success: false, error: "Clip not found or access denied" };
    }

    const result = await _processAndStoreThumbnail(
      targetId,
      idType,
      videoS3Key,
      timeOffset,
      env.PROCESS_VIDEO_ENDPOINT_AUTH, // Auth token for backend service
    );
    return { success: true, thumbnailUrl: result.thumbnailUrl };
  } catch (error) {
    console.error("❌ Error in generateSingleThumbnail:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// For server-side calls (e.g., Inngest), skips session auth, uses passed userId if needed for DB access
export async function generateSingleThumbnailServerSide(
  options: ThumbnailGenerationOptions & { userId?: string }, // userId might be needed if not inferable
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  console.log("🎬 generateSingleThumbnailServerSide called with:", options);
  const { projectId, clipId, videoS3Key, timeOffset = 10, userId } = options;

  if (!projectId && !clipId) {
    return {
      success: false,
      error: "projectId or clipId is required for server-side generation",
    };
  }
  if (!videoS3Key) {
    return {
      success: false,
      error: "videoS3Key is required for server-side generation",
    };
  }

  try {
    const targetId = projectId ?? clipId!;
    const idType = projectId ? "project" : "clip";

    // userId for DB ownership checks if necessary, but the primary auth is for backend service call
    // For server calls, we trust the caller regarding ownership if userId is not strictly needed for lookup itself.

    const result = await _processAndStoreThumbnail(
      targetId,
      idType,
      videoS3Key,
      timeOffset,
      env.PROCESS_VIDEO_ENDPOINT_AUTH, // Auth token for backend service
    );
    return { success: true, thumbnailUrl: result.thumbnailUrl };
  } catch (error) {
    console.error("❌ Error in generateSingleThumbnailServerSide:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function generateProjectAndClipThumbnails(
  projectId: string,
  userId: string, // User ID for ownership checks
): Promise<{ success: boolean; error?: string; results?: Array<unknown> }> {
  console.log(
    `🛠️ generateProjectAndClipThumbnails for project ${projectId}, user ${userId}`,
  );
  try {
    const project = await db.uploadedFile.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return { success: false, error: "Project not found or access denied" };
    }

    const results = [];

    // Generate main project thumbnail
    console.log(`  🖼️ Generating main project thumbnail for ${project.id}...`);
    const projectThumbResult = await generateSingleThumbnail({
      projectId: project.id,
      videoS3Key: project.s3Key,
      timeOffset: 10, // Default for main project thumbnail
    });
    results.push({ type: "project", id: project.id, ...projectThumbResult });

    const clips = await db.clip.findMany({
      where: { uploadedFileId: projectId, userId },
      orderBy: { createdAt: "asc" },
    });
    console.log(`  Found ${clips.length} clips for project ${project.id}.`);

    for (const [index, clip] of clips.entries()) {
      if (!clip.thumbnailUrl) {
        // Only generate if missing
        console.log(
          `    🖼️ Generating thumbnail for clip ${index + 1}/${clips.length} (ID: ${clip.id})...`,
        );
        let clipTimeOffset = 30; // Default into the clip
        if (clip.chunks) {
          try {
            const chunkDataInput: unknown =
              typeof clip.chunks === "string"
                ? JSON.parse(clip.chunks)
                : clip.chunks;
            if (chunkDataInput && typeof chunkDataInput === "object") {
              const startTime =
                Number((chunkDataInput as { start?: number }).start) || 0;
              const endTime =
                Number((chunkDataInput as { end?: number }).end) ||
                startTime + 60;
              const chunkDuration = Math.max(0, endTime - startTime);
              const offsetIntoChunk = Math.min(30, chunkDuration / 2);
              clipTimeOffset = startTime + offsetIntoChunk;
            }
          } catch (e) {
            console.warn("Could not parse clip chunk data for timeOffset", e);
          }
        }

        const clipThumbResult = await generateSingleThumbnail({
          clipId: clip.id,
          videoS3Key: project.s3Key, // Always use original project S3 key for virtual clips
          timeOffset: clipTimeOffset,
        });
        results.push({ type: "clip", id: clip.id, ...clipThumbResult });
      } else {
        console.log(
          `    ⏭️ Skipping thumbnail for clip ${clip.id}, already exists.`,
        );
      }
    }
    return { success: true, results };
  } catch (error) {
    console.error("❌ Error in generateProjectAndClipThumbnails:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Server-side equivalent for Inngest
export async function generateProjectAndClipThumbnailsServerSide(
  projectId: string,
  // userId is optional here, as Inngest might operate without a direct user session but needs to know for whom
  // However, the underlying single thumbnail generation if it needs to verify project ownership would need it.
  // For simplicity, let's assume project is already validated or looked up by trusted ID by the caller.
): Promise<{ success: boolean; error?: string; results?: Array<unknown> }> {
  console.log(
    `🛠️ generateProjectAndClipThumbnailsServerSide for project ${projectId}`,
  );
  try {
    const project = await db.uploadedFile.findFirst({
      where: { id: projectId }, // No userId check, assuming server context call is trusted
    });
    if (!project) {
      return { success: false, error: "Project not found (server-side)" };
    }

    const results = [];

    console.log(
      `  🖼️ Generating main project thumbnail for ${project.id} (server-side)...`,
    );
    const projectThumbResult = await generateSingleThumbnailServerSide({
      projectId: project.id,
      videoS3Key: project.s3Key,
      timeOffset: 10,
    });
    results.push({ type: "project", id: project.id, ...projectThumbResult });

    const clips = await db.clip.findMany({
      where: { uploadedFileId: projectId }, // No userId check
      orderBy: { createdAt: "asc" },
    });
    console.log(
      `  Found ${clips.length} clips for project ${project.id} (server-side).`,
    );

    for (const [index, clip] of clips.entries()) {
      if (!clip.thumbnailUrl) {
        console.log(
          `    🖼️ Generating thumbnail for clip ${index + 1}/${clips.length} (ID: ${clip.id}) (server-side)...`,
        );
        let clipTimeOffset = 30;
        if (clip.chunks) {
          try {
            const chunkDataInput: unknown =
              typeof clip.chunks === "string"
                ? JSON.parse(clip.chunks)
                : clip.chunks;
            if (chunkDataInput && typeof chunkDataInput === "object") {
              const startTime =
                Number((chunkDataInput as { start?: number }).start) || 0;
              const endTime =
                Number((chunkDataInput as { end?: number }).end) ||
                startTime + 60;
              const chunkDuration = Math.max(0, endTime - startTime);
              const offsetIntoChunk = Math.min(30, chunkDuration / 2);
              clipTimeOffset = startTime + offsetIntoChunk;
            }
          } catch (e) {
            console.warn(
              "Could not parse clip chunk data for timeOffset (server-side)",
              e,
            );
          }
        }

        const clipThumbResult = await generateSingleThumbnailServerSide({
          clipId: clip.id,
          videoS3Key: project.s3Key,
          timeOffset: clipTimeOffset,
        });
        results.push({ type: "clip", id: clip.id, ...clipThumbResult });
      } else {
        console.log(
          `    ⏭️ Skipping thumbnail for clip ${clip.id}, already exists (server-side).`,
        );
      }
    }
    return { success: true, results };
  } catch (error) {
    console.error(
      "❌ Error in generateProjectAndClipThumbnailsServerSide:",
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function batchGenerateThumbnails(
  projectIds: string[],
  userId: string,
) {
  console.log(
    `=== BATCH THUMBNAIL GENERATION FOR ${projectIds.length} PROJECTS (User: ${userId}) ===`,
  );
  const results: Array<{
    projectId: string;
    success: boolean;
    error?: string;
    results?: Array<unknown>;
  }> = [];

  for (const [index, projectId] of projectIds.entries()) {
    try {
      console.log(
        `  📁 Processing project ${index + 1}/${projectIds.length}: ${projectId}`,
      );
      const result = await generateProjectAndClipThumbnails(projectId, userId);
      results.push({ projectId, ...result });
      console.log(
        `  ✅ Project ${index + 1}/${projectIds.length} completed with success: ${result.success}`,
      );
    } catch (error) {
      console.error(
        `  ❌ Project ${index + 1}/${projectIds.length} (${projectId}) failed batch processing:`,
        error,
      );
      results.push({
        projectId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  console.log(`🎉 BATCH COMPLETE: Processed ${projectIds.length} projects`);
  return results;
}

// The old generateThumbnail, generateProjectThumbnails, generateThumbnailServerSide, 
// generateProjectThumbnailsServerSide, and batchGenerateThumbnails functions are replaced by the above.
