import { db } from "~/server/db";

/**
 * Data integrity checker to prevent the "missing chunks" issue
 * Run this periodically or in tests to catch data issues early
 */
export async function checkClipsDataIntegrity(projectId?: string) {
  console.log("🔍 Running clips data integrity check...");

  const whereClause = projectId ? { uploadedFileId: projectId } : {};

  try {
    // Check all clips (or specific project)
    const clips = await db.clip.findMany({
      where: whereClause,
      select: {
        id: true,
        uploadedFileId: true,
        userId: true,
        chunks: true,
        createdAt: true,
      },
    });

    // Analyze results
    const totalClips = clips.length;
    const missingChunks = clips.filter((clip) => !clip.chunks);
    const malformedChunks = clips.filter((clip) => {
      if (!clip.chunks) return false;
      try {
        const parsed =
          typeof clip.chunks === "string"
            ? JSON.parse(clip.chunks)
            : clip.chunks;
        return !parsed.chunk_number || !parsed.duration_seconds;
      } catch {
        return true;
      }
    });

    const report = {
      totalClips,
      healthyClips: totalClips - missingChunks.length - malformedChunks.length,
      missingChunks: missingChunks.length,
      malformedChunks: malformedChunks.length,
      issues: [
        ...missingChunks.map((clip) => ({
          type: "missing_chunks",
          clipId: clip.id,
          projectId: clip.uploadedFileId,
          userId: clip.userId,
        })),
        ...malformedChunks.map((clip) => ({
          type: "malformed_chunks",
          clipId: clip.id,
          projectId: clip.uploadedFileId,
          userId: clip.userId,
        })),
      ],
    };

    // Log results
    if (report.issues.length === 0) {
      console.log("✅ All clips have valid chunks data!");
    } else {
      console.error(`🚨 Found ${report.issues.length} data integrity issues:`);
      console.error(report);
    }

    return report;
  } catch (error) {
    console.error("Error running data integrity check:", error);
    throw error;
  }
}

/**
 * Fix clips missing chunks data by regenerating from upload workflow
 * This is a recovery utility if clips exist but lack chunks data
 */
export async function repairClipsMissingChunks(projectId: string) {
  console.log(
    `🔧 Attempting to repair clips missing chunks for project ${projectId}...`,
  );

  // This would need to be implemented based on your specific workflow
  // For now, just log what needs to be done
  const brokenClips = await db.clip.findMany({
    where: {
      uploadedFileId: projectId,
      chunks: null,
    },
    select: { id: true },
  });

  if (brokenClips.length > 0) {
    console.error(`Found ${brokenClips.length} clips missing chunks data.`);
    console.error(
      "To fix: Re-run the Inngest workflow or manually update chunks data.",
    );
    console.error(
      "Broken clip IDs:",
      brokenClips.map((c) => c.id),
    );
  }

  return brokenClips;
}
