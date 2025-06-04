import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

interface RouteParams {
  params: Promise<{ clipId: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clipId } = await context.params;

    // Fetch clip from database
    const clip = await db.clip.findUnique({
      where: { id: clipId },
      include: {
        UploadedFile: {
          select: { displayName: true },
        },
      },
    });

    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    // Check if user owns this clip
    if (clip.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Generate signed URL for the clip
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: clip.s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Parse and format transcription for display
    let formattedTranscription = "Transcription not available for this clip.";
    if (clip.transcription) {
      try {
        const transcriptSegments = JSON.parse(clip.transcription) as unknown;
        if (
          Array.isArray(transcriptSegments) &&
          transcriptSegments.length > 0
        ) {
          // Convert word segments to readable text
          formattedTranscription = transcriptSegments
            .map((segment: { word: string }) => segment.word)
            .filter(Boolean)
            .join(" ")
            .replace(/\s+/g, " ") // Clean up extra spaces
            .trim();
        }
      } catch (error) {
        console.error("Error parsing transcription:", error);
        formattedTranscription = "Error parsing transcription data.";
      }
    }

    return NextResponse.json({
      success: true,
      clip: {
        id: clip.id,
        s3Key: clip.s3Key,
        createdAt: clip.createdAt.toISOString(),
        uploadedFile: clip.UploadedFile,
      },
      videoUrl: signedUrl,
      transcription: formattedTranscription,
    });
  } catch (error) {
    console.error("Error fetching clip:", error);
    return NextResponse.json(
      { error: "Failed to fetch clip data" },
      { status: 500 },
    );
  }
}
