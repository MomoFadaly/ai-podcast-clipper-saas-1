import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId required" },
        { status: 400 },
      );
    }

    // Check project in database
    const project = await db.uploadedFile.findFirst({
      where: { id: projectId },
      select: {
        id: true,
        displayName: true,
        thumbnailUrl: true,
        updatedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check clips in database
    const clips = await db.clip.findMany({
      where: { uploadedFileId: projectId },
      select: {
        id: true,
        thumbnailUrl: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        displayName: project.displayName,
        thumbnailUrl: project.thumbnailUrl,
        updatedAt: project.updatedAt,
        hasThumbnail: !!project.thumbnailUrl,
      },
      clips: clips.map((clip) => ({
        id: clip.id,
        thumbnailUrl: clip.thumbnailUrl,
        updatedAt: clip.updatedAt,
        hasThumbnail: !!clip.thumbnailUrl,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
