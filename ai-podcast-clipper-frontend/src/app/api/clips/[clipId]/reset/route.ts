import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clipId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clipId } = await context.params;

    // Verify the clip belongs to the user
    const clip = await db.clip.findFirst({
      where: {
        id: clipId,
        userId: session.user.id,
      },
    });

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    // Reset clip progress
    const updatedClip = await db.clip.update({
      where: { id: clipId },
      data: {
        isCompleted: false,
        completedAt: null,
        watchTime: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Clip progress reset successfully",
      clip: {
        id: updatedClip.id,
        isCompleted: updatedClip.isCompleted,
        completedAt: updatedClip.completedAt,
        watchTime: updatedClip.watchTime,
      },
    });
  } catch (error) {
    console.error("Error resetting clip progress:", error);
    return NextResponse.json(
      { error: "Failed to reset clip progress" },
      { status: 500 },
    );
  }
}
