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

export async function generateThumbnail(options: ThumbnailGenerationOptions) {
  console.log("=== THUMBNAIL GENERATION START ===");
  console.log("Options received:", options);

  const session = await auth();
  if (!session?.user?.id) {
    console.log("❌ AUTH FAILED: No session or user ID");
    throw new Error("Unauthorized");
  }
  console.log("✅ AUTH SUCCESS: User ID:", session.user.id);

  const { projectId, clipId, timeOffset = 5 } = options;

  try {
    console.log("🔍 STEP 1: Checking environment configuration...");
    if (!env.THUMBNAIL_GENERATION_ENDPOINT) {
      console.log("❌ MISSING: THUMBNAIL_GENERATION_ENDPOINT");
      throw new Error("Thumbnail generation endpoint not configured");
    }
    console.log("✅ ENDPOINT:", env.THUMBNAIL_GENERATION_ENDPOINT);

    if (!env.PROCESS_VIDEO_ENDPOINT_AUTH) {
      console.log("❌ MISSING: PROCESS_VIDEO_ENDPOINT_AUTH");
      throw new Error("Thumbnail generation auth not configured");
    }
    console.log("✅ AUTH TOKEN: Configured");

    // Generate thumbnails for both project and clips
    const thumbnails: { projectThumbnail?: string; clipThumbnail?: string } =
      {};

    console.log("🔍 STEP 2: Determining what to generate...");
    if (projectId) {
      console.log("📁 PROJECT THUMBNAIL: Will generate for project", projectId);
    }
    if (clipId) {
      console.log("🎬 CLIP THUMBNAIL: Will generate for clip", clipId);
    }

    console.log("🔍 STEP 3: Starting thumbnail generation...");

    // Step 3a: Generate project thumbnail if requested
    if (projectId) {
      console.log("📁 Generating PROJECT thumbnail...");
      console.log("Looking up project:", projectId);

      const project = await db.uploadedFile.findFirst({
        where: {
          id: projectId,
          userId: session.user.id,
        },
      });

      if (!project) {
        console.log("❌ PROJECT NOT FOUND:", projectId);
        throw new Error("Project not found");
      }
      console.log(
        "✅ PROJECT FOUND:",
        project.displayName,
        "S3 Key:",
        project.s3Key,
      );

      console.log(
        "📁 Generating signed URL for project using existing utility...",
      );
      // Use the existing working utility to get signed URL
      const projectUrlResult = await getVideoDownloadUrl(project.s3Key);
      if (!projectUrlResult.success || !projectUrlResult.url) {
        throw new Error(
          `Failed to generate signed URL: ${projectUrlResult.error}`,
        );
      }
      console.log("✅ PROJECT SIGNED URL: Generated using existing utility");

      console.log("📁 Calling Modal for project thumbnail...");
      // Call Modal endpoint for project thumbnail
      const modalResponse = await fetch(env.THUMBNAIL_GENERATION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`,
        },
        body: JSON.stringify({
          video_url: projectUrlResult.url,
          time_offset: timeOffset,
        }),
      });

      console.log("📁 Modal response status:", modalResponse.status);

      if (!modalResponse.ok) {
        const errorText = await modalResponse.text();
        console.log("❌ Modal error response:", errorText);
        throw new Error(
          `Modal thumbnail generation failed: ${modalResponse.status} - ${errorText}`,
        );
      }

      console.log("✅ Modal responded successfully, reading thumbnail data...");
      const thumbnailBuffer = Buffer.from(await modalResponse.arrayBuffer());
      console.log("📁 Thumbnail size:", thumbnailBuffer.byteLength, "bytes");

      // Upload to S3 using the existing working utility (no ACLs)
      console.log(
        "📁 Uploading project thumbnail to S3 using existing utility...",
      );
      const thumbnailKey = `thumbnails/projects/${projectId}/thumbnail_${Date.now()}.jpeg`;

      const uploadResult = await uploadToS3(
        thumbnailKey,
        thumbnailBuffer,
        "image/jpeg",
      );

      if (!uploadResult.success) {
        throw new Error(`S3 upload failed: ${uploadResult.error}`);
      }
      console.log("✅ PROJECT THUMBNAIL: Uploaded to S3:", thumbnailKey);

      // Generate the public URL for the thumbnail (same pattern as existing code)
      const projectThumbnailUrl = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/chunkwise/${thumbnailKey}`;
      console.log("📁 Project thumbnail URL:", projectThumbnailUrl);

      // Update the database with the new thumbnail URL
      await db.uploadedFile.update({
        where: { id: projectId },
        data: { thumbnailUrl: projectThumbnailUrl },
      });
      console.log("✅ PROJECT THUMBNAIL: Database updated");

      thumbnails.projectThumbnail = projectThumbnailUrl;
      console.log("📁 PROJECT THUMBNAIL: Generated successfully");
    }

    // Step 3b: Generate clip thumbnail if requested
    if (clipId) {
      console.log("🎬 Generating CLIP thumbnail...");
      console.log("Looking up clip:", clipId);

      const clip = await db.clip.findFirst({
        where: {
          id: clipId,
          userId: session.user.id,
        },
      });

      if (!clip) {
        console.log("❌ CLIP NOT FOUND:", clipId);
        throw new Error("Clip not found");
      }
      console.log("✅ CLIP FOUND: S3 Key:", clip.s3Key);

      console.log(
        "🎬 Generating signed URL for clip using existing utility...",
      );
      // Use the existing working utility to get signed URL
      const clipUrlResult = await getVideoDownloadUrl(clip.s3Key);
      if (!clipUrlResult.success || !clipUrlResult.url) {
        throw new Error(
          `Failed to generate signed URL: ${clipUrlResult.error}`,
        );
      }
      console.log("✅ CLIP SIGNED URL: Generated using existing utility");

      console.log("🎬 Calling Modal for clip thumbnail...");
      // Call Modal endpoint for clip thumbnail
      const modalResponse = await fetch(env.THUMBNAIL_GENERATION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`,
        },
        body: JSON.stringify({
          video_url: clipUrlResult.url,
          time_offset: timeOffset,
        }),
      });

      console.log("🎬 Modal response status:", modalResponse.status);

      if (!modalResponse.ok) {
        const errorText = await modalResponse.text();
        console.log("❌ Modal error response:", errorText);
        throw new Error(
          `Modal thumbnail generation failed: ${modalResponse.status} - ${errorText}`,
        );
      }

      console.log("✅ Modal responded successfully, reading thumbnail data...");
      const thumbnailBuffer = Buffer.from(await modalResponse.arrayBuffer());
      console.log("🎬 Thumbnail size:", thumbnailBuffer.byteLength, "bytes");

      // Upload to S3 using the existing working utility (no ACLs)
      console.log(
        "🎬 Uploading clip thumbnail to S3 using existing utility...",
      );
      const thumbnailKey = `thumbnails/clips/${clipId}/thumbnail_${Date.now()}.jpeg`;

      const uploadResult = await uploadToS3(
        thumbnailKey,
        thumbnailBuffer,
        "image/jpeg",
      );

      if (!uploadResult.success) {
        throw new Error(`S3 upload failed: ${uploadResult.error}`);
      }
      console.log("✅ CLIP THUMBNAIL: Uploaded to S3:", thumbnailKey);

      // Generate the public URL for the thumbnail (same pattern as existing code)
      const clipThumbnailUrl = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/chunkwise/${thumbnailKey}`;
      console.log("🎬 Clip thumbnail URL:", clipThumbnailUrl);

      // Update the database with the new thumbnail URL
      await db.clip.update({
        where: { id: clipId },
        data: { thumbnailUrl: clipThumbnailUrl },
      });
      console.log("✅ CLIP THUMBNAIL: Database updated");

      thumbnails.clipThumbnail = clipThumbnailUrl;
      console.log("🎬 CLIP THUMBNAIL: Generated successfully");
    }

    console.log("🎉 THUMBNAIL GENERATION COMPLETE");
    console.log("Results:", thumbnails);
    return { success: true, thumbnails };
  } catch (error) {
    console.log("❌ THUMBNAIL GENERATION ERROR:");
    console.error(error);
    throw new Error(
      `Thumbnail generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function generateProjectThumbnails(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Get project and its clips with explicit typing
    const project = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Get clips separately to match the pattern used in other parts of the codebase
    const clips = await db.clip.findMany({
      where: {
        uploadedFileId: projectId,
        userId: session.user.id,
      },
    });

    const results: Array<{
      type: string;
      clipId?: string;
      [key: string]: unknown;
    }> = [];

    // Generate main project thumbnail (from 10 seconds into the video)
    // Always regenerate project thumbnail to ensure it's working
    console.log(
      `Generating main thumbnail for project ${projectId} (forced regeneration)`,
    );
    const mainThumbnail = await generateThumbnail({
      projectId,
      videoS3Key: project.s3Key,
      timeOffset: 10, // 10 seconds into the video for main thumbnail
    });
    results.push({ type: "project", ...mainThumbnail });

    // Use the clips from the separate query
    // Generate thumbnails for clips that don't have them
    for (const [index, clip] of clips.entries()) {
      // Type assertion needed due to TypeScript not recognizing thumbnailUrl field
      const clipWithThumbnail = clip as typeof clip & { thumbnailUrl?: string };

      if (!clipWithThumbnail.thumbnailUrl) {
        console.log(`Generating thumbnail for clip ${clip.id}`);

        // Calculate time offset for this clip
        // Use 5 seconds into each clip, plus an estimated offset based on clip order
        // Assuming clips are roughly 5 minutes each
        const estimatedClipStart = index * 300; // 5 minutes per clip
        const clipThumbnailOffset = Math.max(5, estimatedClipStart + 30); // 30 seconds into each clip

        const clipThumbnail = await generateThumbnail({
          clipId: clip.id,
          videoS3Key: clip.s3Key,
          timeOffset: clipThumbnailOffset,
        });
        results.push({ type: "clip", clipId: clip.id, ...clipThumbnail });
      }
    }

    return {
      success: true,
      results,
      projectId,
    };
  } catch (error) {
    console.error("Error generating project thumbnails:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate thumbnails",
    };
  }
}

export async function batchGenerateThumbnails(projectIds: string[]) {
  const results: Array<{ projectId: string; [key: string]: unknown }> = [];

  for (const projectId of projectIds) {
    try {
      const result = await generateProjectThumbnails(projectId);
      results.push({ projectId, ...result });
    } catch (error) {
      results.push({
        projectId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
