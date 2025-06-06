import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { randomUUID } from "crypto";
import { inngest } from "~/inngest/client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 },
      );
    }

    const { youtube_url, chunk_config } = body as {
      youtube_url: string;
      chunk_config?: {
        method: string;
        minutesPerChunk?: number;
        totalChunks?: number;
      };
    };

    if (!youtube_url) {
      return NextResponse.json(
        { success: false, message: "youtube_url is required" },
        { status: 400 },
      );
    }

    // Validate YouTube URL
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(youtube_url)) {
      return NextResponse.json(
        { success: false, message: "Invalid YouTube URL" },
        { status: 400 },
      );
    }

    console.log(`🚀 Processing YouTube video: ${youtube_url}`);
    console.log(`📋 Chunk config:`, chunk_config);

    // Create a project record first for the YouTube video
    const projectId = randomUUID();
    const project = await db.uploadedFile.create({
      data: {
        id: projectId,
        s3Key: `youtube_videos/${projectId}/placeholder.mp4`, // Will be updated by processor
        displayName: `YouTube Video ${new Date().toISOString()}`, // Will be updated with actual title
        uploaded: true,
        status: "queued",
        userId: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Use the new chunkwise processing system via Inngest
    console.log(`📤 Triggering chunkwise processing for project: ${projectId}`);
    await inngest.send({
      name: "chunkwise.process-video",
      data: {
        videoId: projectId,
        userId: session.user.id,
        youtubeUrl: youtube_url,
        chunkConfig: chunk_config ?? {
          method: "minutes",
          minutesPerChunk: 5,
          totalChunks: 1,
        },
      },
    });

    console.log(`✅ YouTube processing initiated for project: ${projectId}`);

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        status: project.status,
        displayName: project.displayName,
      },
      message: "YouTube video processing started",
    });
  } catch (error) {
    console.error("❌ Error in youtube-process API route:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
