"use server";

import { revalidatePath } from "next/cache";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export interface ProjectWithStats {
  id: string;
  displayName: string | null;
  s3Key: string;
  uploaded: boolean;
  status: string;
  processingProgress: number;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  totalClips: number;
  completedClips: number;
  progressPercentage: number;
  // Optional fields for backward compatibility
  chunksCount?: number;
  completedChunks?: number;
  totalDuration?: string;
  thumbnail?: string;
  youtubeUrl?: string;
}

export interface DashboardStats {
  totalProjects: number;
  completedChunks: number;
  totalWatchTime: string;
  learningStreak: number;
  inProgressProjects: number;
  completedProjects: number;
  processingProjects: number;
}

// Chunk data structure from backend
export interface ChunkData {
  chunk_number: number;
  start_time_seconds: number;
  end_time_seconds: number;
  duration_seconds: number;
}

export interface ClipWithDetails {
  // Core identifiers (required)
  id: string;
  s3Key: string;
  uploadedFileId: string | null;
  userId: string;

  // Timestamps (required)
  createdAt: Date;
  updatedAt: Date;

  // User progress (required)
  isCompleted: boolean;
  completedAt: Date | null;
  watchTime: number;

  // Media data (required for functionality)
  thumbnailUrl: string | null;
  chunks: ChunkData | null; // CRITICAL: Must be included for clips to work properly

  // Optional data
  transcription?: string;
}

/**
 * Get all projects for the current user - OPTIMIZED
 */
export async function getUserProjects(): Promise<ProjectWithStats[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // First, get all projects without expensive joins
    const projects = await db.uploadedFile.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        s3Key: true,
        displayName: true,
        uploaded: true,
        status: true,
        processingProgress: true,
        thumbnailUrl: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // If no projects, return early
    if (projects.length === 0) {
      return [];
    }

    // Get clip counts in a single optimized query
    const clipCounts = await db.clip.groupBy({
      by: ["uploadedFileId"],
      where: {
        uploadedFileId: {
          in: projects.map((p) => p.id),
        },
        userId: session.user.id,
      },
      _count: {
        id: true,
      },
    });

    // Get completed counts separately
    const completedCounts = await db.clip.groupBy({
      by: ["uploadedFileId"],
      where: {
        uploadedFileId: {
          in: projects.map((p) => p.id),
        },
        userId: session.user.id,
        isCompleted: true,
      },
      _count: {
        id: true,
      },
    });

    // Create lookup maps for O(1) access
    const clipCountMap = new Map(
      clipCounts.map((count) => [count.uploadedFileId, count._count.id]),
    );

    const completedCountMap = new Map(
      completedCounts.map((count) => [count.uploadedFileId, count._count.id]),
    );

    return projects.map((project) => {
      const total = clipCountMap.get(project.id) ?? 0;
      const completed = completedCountMap.get(project.id) ?? 0;
      const progressPercentage =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: project.id,
        s3Key: project.s3Key,
        displayName: project.displayName,
        uploaded: project.uploaded,
        status: project.status,
        processingProgress: project.processingProgress,
        thumbnailUrl: project.thumbnailUrl,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        userId: project.userId,
        totalClips: total,
        completedClips: completed,
        progressPercentage: progressPercentage,
        // Backward compatibility fields
        chunksCount: total,
        completedChunks: completed,
      };
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    throw new Error("Failed to fetch projects");
  }
}

/**
 * Get recent projects (limited to 5) for dashboard display
 */
export async function getRecentProjects(): Promise<ProjectWithStats[]> {
  const allProjects = await getUserProjects();
  return allProjects.slice(0, 5);
}

/**
 * Get dashboard data efficiently in a single call - OPTIMIZED
 */
export async function getDashboardData(): Promise<{
  recentProjects: ProjectWithStats[];
  stats: DashboardStats;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Get all projects once and derive everything from it
    const allProjects = await getUserProjects();

    // Get recent projects (first 5)
    const recentProjects = allProjects.slice(0, 5);

    // Calculate stats from the same data
    const totalProjects = allProjects.length;
    const completedChunks = allProjects.reduce(
      (sum, project) => sum + (project.completedChunks ?? 0),
      0,
    );
    const inProgressProjects = allProjects.filter(
      (p) =>
        p.status === "processing" ||
        (p.progressPercentage > 0 && p.progressPercentage < 100),
    ).length;
    const completedProjects = allProjects.filter(
      (p) => p.status === "processed" || p.progressPercentage === 100,
    ).length;
    const processingProjects = allProjects.filter(
      (p) => p.status === "processing" || p.status === "queued",
    ).length;

    // Calculate total watch time (estimate based on chunks)
    const totalMinutes = allProjects.reduce((sum, project) => {
      const duration = parseDuration(project.totalDuration ?? "0:00");
      return sum + duration;
    }, 0);

    const totalWatchTime = formatDuration(totalMinutes);

    // Calculate learning streak
    const learningStreak = calculateLearningStreak(allProjects);

    const stats: DashboardStats = {
      totalProjects,
      completedChunks,
      totalWatchTime,
      learningStreak,
      inProgressProjects,
      completedProjects,
      processingProjects,
    };

    return { recentProjects, stats };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw new Error("Failed to fetch dashboard data");
  }
}

/**
 * Get dashboard stats - LEGACY (use getDashboardData instead)
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { stats } = await getDashboardData();
  return stats;
}

/**
 * Get a specific project by ID - OPTIMIZED
 */
export async function getProjectById(
  projectId: string,
): Promise<ProjectWithStats | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Get the project without expensive joins
    const uploadedFile = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      select: {
        id: true,
        s3Key: true,
        displayName: true,
        uploaded: true,
        status: true,
        processingProgress: true,
        thumbnailUrl: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    if (!uploadedFile) {
      return null;
    }

    // Get clip counts in a separate optimized query
    const clipStats = await db.clip.aggregate({
      where: {
        uploadedFileId: projectId,
        userId: session.user.id,
      },
      _count: {
        id: true,
      },
    });

    // Get completed clips count separately
    const completedStats = await db.clip.aggregate({
      where: {
        uploadedFileId: projectId,
        userId: session.user.id,
        isCompleted: true,
      },
      _count: {
        id: true,
      },
    });

    const chunksCount = clipStats._count.id ?? 0;
    const completedChunks = completedStats._count.id ?? 0;
    const progressPercentage =
      chunksCount > 0 ? (completedChunks / chunksCount) * 100 : 0;

    return {
      id: uploadedFile.id,
      displayName:
        uploadedFile.displayName ?? extractTitleFromS3Key(uploadedFile.s3Key),
      s3Key: uploadedFile.s3Key,
      uploaded: uploadedFile.uploaded,
      status: uploadedFile.status,
      processingProgress: uploadedFile.processingProgress,
      thumbnailUrl: uploadedFile.thumbnailUrl ?? null,
      createdAt: uploadedFile.createdAt,
      updatedAt: uploadedFile.updatedAt,
      userId: uploadedFile.userId,
      totalClips: chunksCount,
      completedClips: completedChunks,
      progressPercentage,
      // Backward compatibility fields
      chunksCount,
      completedChunks,
      totalDuration: estimateDurationFromChunks(chunksCount),
      youtubeUrl: extractYouTubeUrlFromS3Key(uploadedFile.s3Key),
    };
  } catch (error) {
    console.error("Error fetching project:", error);
    throw new Error("Failed to fetch project");
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // First check if the project exists and belongs to the user
    const existingProject = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      console.error("Project not found or doesn't belong to user:", projectId);
      return false;
    }

    // Log the deletion attempt for debugging
    console.log("Attempting to delete project:", projectId);

    // Delete the project - cascading deletes should handle related records
    await db.uploadedFile.delete({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    console.log("Successfully deleted project:", projectId);

    // Invalidate cache to refresh the UI
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");

    return true;
  } catch (error) {
    console.error("Error deleting project:", error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Check if it's a Prisma error
    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string; meta?: unknown };
      console.error("Prisma error code:", prismaError.code);
      console.error("Prisma error meta:", prismaError.meta);
    }

    return false;
  }
}

/**
 * Create a new project from YouTube URL
 */
export async function createYouTubeProject(
  youtubeUrl: string,
  metadata: {
    title: string;
    duration: number;
    thumbnail?: string;
    channel?: string;
    description?: string;
  },
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Extract video ID from YouTube URL
    const videoId = extractVideoIdFromUrl(youtubeUrl);
    if (!videoId) {
      return { success: false, error: "Invalid YouTube URL" };
    }

    // Create the project in database
    const uploadedFile = await db.uploadedFile.create({
      data: {
        id: crypto.randomUUID(),
        s3Key: `youtube/${videoId}/${metadata.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`,
        displayName: metadata.title,
        status: "queued",
        userId: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache to refresh the UI
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");

    return { success: true, projectId: uploadedFile.id };
  } catch (error) {
    console.error("Error creating YouTube project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/**
 * Create a new project from uploaded file
 */
export async function createFileProject(
  fileName: string,
  s3Key: string,
  displayName?: string,
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const uploadedFile = await db.uploadedFile.create({
      data: {
        id: crypto.randomUUID(),
        s3Key,
        displayName: displayName ?? fileName,
        status: "queued",
        userId: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache to refresh the UI
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");

    return { success: true, projectId: uploadedFile.id };
  } catch (error) {
    console.error("Error creating file project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  projectId: string,
  status: string,
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await db.uploadedFile.update({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache to refresh the UI
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/projects");

    return true;
  } catch (error) {
    console.error("Error updating project status:", error);
    return false;
  }
}

/**
 * Get clips for a specific project - OPTIMIZED with pagination
 */
export async function getProjectClips(
  projectId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeTranscription?: boolean;
  },
): Promise<ClipWithDetails[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const {
    limit = 50,
    offset = 0,
    includeTranscription = false,
  } = options ?? {};

  try {
    const clips = await db.clip.findMany({
      where: {
        uploadedFileId: projectId,
        userId: session.user.id,
      },
      // Use comprehensive selection to prevent missing critical fields
      select: {
        // Core identifiers
        id: true,
        s3Key: true,
        uploadedFileId: true,
        userId: true,

        // Timestamps
        createdAt: true,
        updatedAt: true,

        // User progress data
        isCompleted: true,
        completedAt: true,
        watchTime: true,

        // Media data
        thumbnailUrl: true,
        chunks: true, // CRITICAL: Contains timing, duration, and chunk metadata

        // Optional transcription (only if requested to avoid large payloads)
        ...(includeTranscription && { transcription: true }),
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      skip: offset,
    });

    // Validate and transform clips with runtime checks
    const validatedClips = clips.map((clip) => {
      // CRITICAL VALIDATION: Ensure chunks data is present
      if (!clip.chunks) {
        console.error(
          `⚠️  MISSING CHUNKS DATA for clip ${clip.id} in project ${projectId}! This will cause UI issues.`,
        );
        console.error("Clip data:", clip);
      }

      return {
        ...clip,
        // Add transcription as undefined if not requested to maintain interface
        transcription: includeTranscription ? clip.transcription : undefined,
      };
    }) as ClipWithDetails[];

    // Log summary for debugging
    console.log(
      `📊 Fetched ${validatedClips.length} clips for project ${projectId}:`,
    );
    const chunksValidation = validatedClips.map((clip) => ({
      id: clip.id.split("-chunk-")[1] || "unknown",
      hasChunks: !!clip.chunks,
      duration: clip.chunks?.duration_seconds || 0,
    }));
    console.log("Chunks validation:", chunksValidation);

    return validatedClips;
  } catch (error) {
    console.error("Error fetching project clips:", error);
    throw new Error("Failed to fetch project clips");
  }
}

// Helper functions

function extractTitleFromS3Key(s3Key: string): string {
  // Extract a readable title from the S3 key
  const parts = s3Key.split("/");
  const filename = parts[parts.length - 1] ?? s3Key;
  return filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
}

function estimateDurationFromChunks(chunksCount: number): string {
  // Estimate 5 minutes per chunk on average
  const totalMinutes = chunksCount * 5;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:00`;
  }
  return `${minutes}:00`;
}

function generateThumbnailFromS3Key(s3Key: string): string {
  // For now, return a placeholder. In a real implementation,
  // you might generate thumbnails or store them in the database
  return `https://via.placeholder.com/480x270/6366f1/ffffff?text=${encodeURIComponent(extractTitleFromS3Key(s3Key))}`;
}

function extractYouTubeUrlFromS3Key(s3Key: string): string | undefined {
  // If the S3 key contains YouTube video ID patterns, construct the URL
  // This is a placeholder - you might store the original URL in the database
  const youtubeIdMatch = /([a-zA-Z0-9_-]{11})/.exec(s3Key);
  if (youtubeIdMatch) {
    return `https://www.youtube.com/watch?v=${youtubeIdMatch[1]}`;
  }
  return undefined;
}

function parseDuration(duration: string): number {
  // Parse duration string like "2:15:30" or "45:30" into total minutes
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0) + (parts[2] ?? 0) / 60;
  } else if (parts.length === 2) {
    return (parts[0] ?? 0) + (parts[1] ?? 0) / 60;
  }
  return 0;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function calculateLearningStreak(projects: ProjectWithStats[]): number {
  // Mock learning streak calculation
  // In a real implementation, you'd track daily learning activities
  const recentActivity = projects.filter((p) => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysSinceUpdate <= 7;
  });

  return Math.min(recentActivity.length, 7);
}

function extractVideoIdFromUrl(url: string): string | null {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = regExp.exec(url);
  return match?.[7]?.length === 11 ? match[7] : null;
}
