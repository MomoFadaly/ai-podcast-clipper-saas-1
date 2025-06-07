import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await context.params;

    // Verify the project belongs to the user
    const project = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Reset all clips in the project
    const result = await db.clip.updateMany({
      where: {
        uploadedFileId: projectId,
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
      message: `Progress reset for ${result.count} clips in project`,
      resettedClipsCount: result.count,
    });
  } catch (error) {
    console.error("Error resetting project progress:", error);
    return NextResponse.json(
      { error: "Failed to reset project progress" },
      { status: 500 },
    );
  }
}
