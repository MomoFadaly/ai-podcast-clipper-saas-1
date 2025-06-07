import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ trackId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackId } = await context.params;

    // Verify the track belongs to the user
    const track = await db.track.findFirst({
      where: {
        id: trackId,
        userId: session.user.id,
      },
    });

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Get all projects in this track
    const projectTracks = await db.projectTrack.findMany({
      where: {
        trackId: trackId,
      },
      select: {
        projectId: true,
      },
    });

    const projectIds = projectTracks.map((pt) => pt.projectId);

    if (projectIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No projects found in this track",
        resettedClipsCount: 0,
      });
    }

    // Reset all clips in all projects within this track
    const result = await db.clip.updateMany({
      where: {
        uploadedFileId: {
          in: projectIds,
        },
        userId: session.user.id,
      },
      data: {
        isCompleted: false,
        completedAt: null,
        watchTime: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Progress reset for ${result.count} clips across ${projectIds.length} projects in track`,
      resettedClipsCount: result.count,
      projectsCount: projectIds.length,
    });
  } catch (error) {
    console.error("Error resetting track progress:", error);
    return NextResponse.json(
      { error: "Failed to reset track progress" },
      { status: 500 },
    );
  }
}
