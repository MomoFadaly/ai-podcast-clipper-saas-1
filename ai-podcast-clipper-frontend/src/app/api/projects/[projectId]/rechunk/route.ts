import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { inngest } from "~/inngest/client";

interface ChunkConfig {
  method: "minutes" | "chunks";
  minutesPerChunk: number;
  totalChunks: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = (await request.json()) as { chunkConfig: ChunkConfig };
    const { chunkConfig } = body;

    console.log("🔄 DEBUG: Re-chunk request for project:", projectId);
    console.log("🔄 DEBUG: Chunk config:", chunkConfig);

    if (
      !chunkConfig?.method ||
      (!chunkConfig.minutesPerChunk && !chunkConfig.totalChunks) ||
      (chunkConfig.minutesPerChunk && chunkConfig.minutesPerChunk <= 0) ||
      (chunkConfig.totalChunks && chunkConfig.totalChunks <= 0)
    ) {
      return NextResponse.json(
        { error: "Invalid chunk configuration" },
        { status: 400 },
      );
    }

    const project = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      select: {
        id: true,
        s3Key: true,
        status: true,
        transcript: true, // Select transcript directly from UploadedFile
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "completed" && project.status !== "processed") {
      return NextResponse.json(
        { error: "Project must be completed or processed before re-chunking" },
        { status: 400 },
      );
    }

    const extractYouTubeUrl = (s3Key: string): string | undefined => {
      const youtubeIdMatch = /([a-zA-Z0-9_-]{11})/.exec(s3Key);
      if (youtubeIdMatch?.[1]) {
        return `https://www.youtube.com/watch?v=${youtubeIdMatch[1]}`;
      }
      return undefined;
    };

    let existingTranscript: Array<{
      start: number;
      end: number;
      word: string;
    }> = [];

    if (project.transcript) {
      try {
        // Attempt to use the transcript field from the project
        const transcriptData = project.transcript as Array<{
          start: number;
          end: number;
          word: string;
        }>;
        if (Array.isArray(transcriptData)) {
          existingTranscript = transcriptData;
          console.log(
            "✅ DEBUG: Used existing transcript from UploadedFile.transcript with",
            existingTranscript.length,
            "segments for re-chunking.",
          );
        } else {
          console.warn(
            "⚠️ DEBUG: UploadedFile.transcript data is not an array for project",
            projectId,
            ". Backend will re-transcribe.",
          );
        }
      } catch (error) {
        console.warn(
          "❌ DEBUG: Failed to process existing UploadedFile.transcript for project",
          projectId,
          ":",
          error,
          ". Backend will re-transcribe.",
        );
      }
    } else {
      console.log(
        "ℹ️ DEBUG: No transcript found on UploadedFile for project",
        projectId,
        ". Backend will re-transcribe for re-chunking.",
      );
    }
    // The fallback to project.Clip[0].transcription (string field) has been removed for simplification.
    // If existingTranscript remains empty, the backend will handle re-transcription if needed.

    console.log(
      "🔄 DEBUG: Transcript extraction complete, now deleting existing clips for project",
      projectId,
    );

    await db.clip.deleteMany({
      where: { uploadedFileId: projectId },
    });

    await db.uploadedFile.update({
      where: { id: projectId },
      data: { status: "processing" }, // Set to processing for re-chunk
    });

    const eventData = {
      videoId: projectId,
      userId: session.user.id,
      chunkConfig: chunkConfig,
      s3Key: project.s3Key,
      youtubeUrl: extractYouTubeUrl(project.s3Key),
      existingTranscript:
        existingTranscript.length > 0 ? existingTranscript : undefined, // Pass undefined if empty
    };

    console.log("🔄 Triggering re-chunk processing via Inngest:", eventData);
    await inngest.send({
      name: "chunkwise.process-video",
      data: eventData,
    });

    return NextResponse.json({
      success: true,
      message: "Re-chunking initiated successfully",
      projectId,
    });
  } catch (error) {
    console.error("Error in re-chunk API for project:", error);
    return NextResponse.json(
      {
        error: "Internal server error during re-chunk initiation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
