import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { checkClipsDataIntegrity } from "~/lib/data-integrity";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Get project details
    const project = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get clips for this project
    const clips = await db.clip.findMany({
      where: {
        uploadedFileId: projectId,
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Get clip count
    const clipCount = await db.clip.count({
      where: {
        uploadedFileId: projectId,
        userId: session.user.id,
      },
    });

    // Run data integrity check
    const integrityReport = await checkClipsDataIntegrity(projectId);

    return NextResponse.json({
      project: {
        id: project.id,
        displayName: project.displayName,
        status: project.status,
        processingProgress: project.processingProgress,
        s3Key: project.s3Key,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        duration: project.duration,
        transcript: project.transcript ? "Has transcript" : "No transcript",
      },
      clips: clips.map((clip) => ({
        id: clip.id,
        s3Key: clip.s3Key,
        createdAt: clip.createdAt,
        chunks: clip.chunks
          ? {
              hasData: true,
              chunkNumber: clip.chunks?.chunk_number || "unknown",
              duration: clip.chunks?.duration_seconds || 0,
              startTime: clip.chunks?.start_time_seconds || 0,
              endTime: clip.chunks?.end_time_seconds || 0,
            }
          : {
              hasData: false,
              error: "MISSING CHUNKS DATA - This will cause UI issues!",
            },
        thumbnailUrl: clip.thumbnailUrl,
      })),
      clipCount,
      integrityReport,
      debug: {
        projectTableStatus: project.status,
        expectedChunks: "Unknown - check transcript",
        actualClips: clipCount,
        hasTranscript: !!project.transcript,
        hasDuration: !!project.duration,
        dataIntegrityHealthy: integrityReport.issues.length === 0,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
