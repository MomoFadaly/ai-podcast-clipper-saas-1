"use server";

import { revalidatePath } from "next/cache";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

// Track Interfaces
export interface Track {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface TrackSummary {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

export interface TrackWithStats extends Track {
  projectCount: number;
  completedProjects: number;
  totalProgress: number;
  averageProgress: number;
}

export interface CreateTrackData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateTrackData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

/**
 * Get all tracks for the current user with statistics
 */
export async function getUserTracks(): Promise<TrackWithStats[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Get all tracks for the user
    const tracks = await db.track.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (tracks.length === 0) {
      return [];
    }

    // Get project counts and progress for each track
    const trackStats = await Promise.all(
      tracks.map(async (track) => {
        // Get projects in this track
        const projectTracks = await db.projectTrack.findMany({
          where: {
            trackId: track.id,
          },
          include: {
            Project: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        const projectIds = projectTracks.map((pt) => pt.projectId);

        if (projectIds.length === 0) {
          return {
            ...track,
            projectCount: 0,
            completedProjects: 0,
            totalProgress: 0,
            averageProgress: 0,
          };
        }

        // Get clip statistics for progress calculation
        const totalClips = await db.clip.aggregate({
          where: {
            uploadedFileId: { in: projectIds },
            userId: session.user.id,
          },
          _count: { id: true },
        });

        const completedClips = await db.clip.aggregate({
          where: {
            uploadedFileId: { in: projectIds },
            userId: session.user.id,
            isCompleted: true,
          },
          _count: { id: true },
        });

        const totalClipsCount = totalClips._count.id ?? 0;
        const completedClipsCount = completedClips._count.id ?? 0;
        const totalProgress =
          totalClipsCount > 0
            ? Math.round((completedClipsCount / totalClipsCount) * 100)
            : 0;

        // Count completed projects (100% progress or processed status)
        const completedProjects = projectTracks.filter(
          (pt) => pt.Project.status === "processed",
        ).length;

        return {
          ...track,
          projectCount: projectIds.length,
          completedProjects,
          totalProgress,
          averageProgress: totalProgress, // For now, same as total progress
        };
      }),
    );

    return trackStats;
  } catch (error) {
    console.error("Error fetching user tracks:", error);
    throw new Error("Failed to fetch tracks");
  }
}

/**
 * Get a specific track by ID with statistics
 */
export async function getTrackById(
  trackId: string,
): Promise<TrackWithStats | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const track = await db.track.findFirst({
      where: {
        id: trackId,
        userId: session.user.id,
      },
    });

    if (!track) {
      return null;
    }

    // Get project statistics for this track
    const projectTracks = await db.projectTrack.findMany({
      where: {
        trackId: track.id,
      },
      include: {
        Project: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const projectIds = projectTracks.map((pt) => pt.projectId);

    if (projectIds.length === 0) {
      return {
        ...track,
        projectCount: 0,
        completedProjects: 0,
        totalProgress: 0,
        averageProgress: 0,
      };
    }

    // Calculate progress statistics
    const totalClips = await db.clip.aggregate({
      where: {
        uploadedFileId: { in: projectIds },
        userId: session.user.id,
      },
      _count: { id: true },
    });

    const completedClips = await db.clip.aggregate({
      where: {
        uploadedFileId: { in: projectIds },
        userId: session.user.id,
        isCompleted: true,
      },
      _count: { id: true },
    });

    const totalClipsCount = totalClips._count.id ?? 0;
    const completedClipsCount = completedClips._count.id ?? 0;
    const totalProgress =
      totalClipsCount > 0
        ? Math.round((completedClipsCount / totalClipsCount) * 100)
        : 0;

    const completedProjects = projectTracks.filter(
      (pt) => pt.Project.status === "processed",
    ).length;

    return {
      ...track,
      projectCount: projectIds.length,
      completedProjects,
      totalProgress,
      averageProgress: totalProgress,
    };
  } catch (error) {
    console.error("Error fetching track:", error);
    throw new Error("Failed to fetch track");
  }
}

/**
 * Create a new track
 */
export async function createTrack(data: CreateTrackData): Promise<{
  success: boolean;
  trackId?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const track = await db.track.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        userId: session.user.id,
      },
    });

    // Revalidate tracks-related pages
    revalidatePath("/dashboard/tracks");
    revalidatePath("/dashboard");

    return { success: true, trackId: track.id };
  } catch (error) {
    console.error("Error creating track:", error);
    return { success: false, error: "Failed to create track" };
  }
}

/**
 * Update an existing track
 */
export async function updateTrack(
  trackId: string,
  data: UpdateTrackData,
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await db.track.update({
      where: {
        id: trackId,
        userId: session.user.id,
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.icon !== undefined && { icon: data.icon }),
        updatedAt: new Date(),
      },
    });

    // Revalidate tracks-related pages
    revalidatePath("/dashboard/tracks");
    revalidatePath(`/dashboard/tracks/${trackId}`);
    revalidatePath("/dashboard");

    return true;
  } catch (error) {
    console.error("Error updating track:", error);
    return false;
  }
}

/**
 * Delete a track and all its project associations
 */
export async function deleteTrack(trackId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Delete the track (ProjectTrack records will be deleted via cascade)
    await db.track.delete({
      where: {
        id: trackId,
        userId: session.user.id,
      },
    });

    // Revalidate tracks-related pages
    revalidatePath("/dashboard/tracks");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/library");

    return true;
  } catch (error) {
    console.error("Error deleting track:", error);
    return false;
  }
}

/**
 * Add a project to a track
 */
export async function addProjectToTrack(
  projectId: string,
  trackId: string,
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the user owns both the project and track
    const [project, track] = await Promise.all([
      db.uploadedFile.findFirst({
        where: { id: projectId, userId: session.user.id },
      }),
      db.track.findFirst({
        where: { id: trackId, userId: session.user.id },
      }),
    ]);

    if (!project || !track) {
      throw new Error("Project or track not found");
    }

    // Check if association already exists
    const existingAssociation = await db.projectTrack.findFirst({
      where: {
        projectId,
        trackId,
      },
    });

    if (existingAssociation) {
      return true; // Already associated, consider it success
    }

    // Get the next order number (highest order + 1)
    const lastProjectTrack = await db.projectTrack.findFirst({
      where: { trackId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (lastProjectTrack?.order ?? -1) + 1;

    // Create the association
    await db.projectTrack.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        trackId,
        order: nextOrder,
      },
    });

    // Revalidate relevant pages
    revalidatePath("/dashboard/tracks");
    revalidatePath(`/dashboard/tracks/${trackId}`);
    revalidatePath("/dashboard/library");
    revalidatePath(`/dashboard/projects/${projectId}`);

    return true;
  } catch (error) {
    console.error("Error adding project to track:", error);
    return false;
  }
}

/**
 * Remove a project from a track
 */
export async function removeProjectFromTrack(
  projectId: string,
  trackId: string,
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    await db.projectTrack.deleteMany({
      where: {
        projectId,
        trackId,
        Project: {
          userId: session.user.id,
        },
        Track: {
          userId: session.user.id,
        },
      },
    });

    // Revalidate relevant pages
    revalidatePath("/dashboard/tracks");
    revalidatePath(`/dashboard/tracks/${trackId}`);
    revalidatePath("/dashboard/library");
    revalidatePath(`/dashboard/projects/${projectId}`);

    return true;
  } catch (error) {
    console.error("Error removing project from track:", error);
    return false;
  }
}

/**
 * Get all projects within a specific track
 */
export async function getTrackProjects(trackId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const projectTracks = await db.projectTrack.findMany({
      where: {
        trackId,
        Track: {
          userId: session.user.id,
        },
      },
      include: {
        Project: {
          select: {
            id: true,
            s3Key: true,
            displayName: true,
            uploaded: true,
            status: true,
            thumbnailUrl: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { addedAt: "desc" }],
    });

    // Return the projects with track association info
    return projectTracks.map((pt) => ({
      ...pt.Project,
      addedToTrackAt: pt.addedAt,
    }));
  } catch (error) {
    console.error("Error fetching track projects:", error);
    throw new Error("Failed to fetch track projects");
  }
}

/**
 * Get tracks associated with a specific project
 */
export async function getProjectTracks(
  projectId: string,
): Promise<TrackSummary[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    const projectTracks = await db.projectTrack.findMany({
      where: {
        projectId,
        Project: {
          userId: session.user.id,
        },
      },
      include: {
        Track: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
    });

    return projectTracks.map((pt) => pt.Track);
  } catch (error) {
    console.error("Error fetching project tracks:", error);
    throw new Error("Failed to fetch project tracks");
  }
}

/**
 * Update the order of projects within a track
 */
export async function updateProjectOrder(
  trackId: string,
  projectOrders: { projectId: string; order: number }[],
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the user owns the track
    const track = await db.track.findFirst({
      where: { id: trackId, userId: session.user.id },
    });

    if (!track) {
      throw new Error("Track not found");
    }

    // Update each project order in a transaction
    await db.$transaction(
      projectOrders.map(({ projectId, order }) =>
        db.projectTrack.updateMany({
          where: {
            trackId,
            projectId,
            Project: {
              userId: session.user.id,
            },
          },
          data: {
            order,
          },
        }),
      ),
    );

    // Revalidate relevant pages
    revalidatePath(`/dashboard/tracks/${trackId}`);
    revalidatePath("/dashboard/tracks");
    revalidatePath("/dashboard/library");

    return true;
  } catch (error) {
    console.error("Error updating project order:", error);
    return false;
  }
}
