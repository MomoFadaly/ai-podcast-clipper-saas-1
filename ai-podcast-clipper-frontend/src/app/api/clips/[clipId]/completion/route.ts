import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

interface CompletionBody {
  isCompleted?: boolean;
  watchTime?: number;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clipId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clipId } = await context.params;
    const body = (await request.json()) as CompletionBody;
    const { isCompleted, watchTime } = body;

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

    // Update clip completion status
    const updatedClip = await db.clip.update({
      where: { id: clipId },
      data: {
        isCompleted: isCompleted ?? clip.isCompleted,
        completedAt: isCompleted ? new Date() : clip.completedAt,
        watchTime: watchTime ?? clip.watchTime,
      },
    });

    return NextResponse.json({
      success: true,
      clip: {
        id: updatedClip.id,
        isCompleted: updatedClip.isCompleted,
        completedAt: updatedClip.completedAt,
        watchTime: updatedClip.watchTime,
      },
    });
  } catch (error) {
    console.error("Error updating clip completion:", error);
    return NextResponse.json(
      { error: "Failed to update completion status" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clipId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clipId } = await context.params;

    const clip = await db.clip.findFirst({
      where: {
        id: clipId,
        userId: session.user.id,
      },
      select: {
        id: true,
        isCompleted: true,
        completedAt: true,
        watchTime: true,
      },
    });

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    return NextResponse.json({ clip });
  } catch (error) {
    console.error("Error fetching clip completion status:", error);
    return NextResponse.json(
      { error: "Failed to fetch completion status" },
      { status: 500 },
    );
  }
}
