import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      clipId,
      projectId,
      timeOffset = 5,
    } = (await request.json()) as {
      clipId?: string;
      projectId?: string;
      timeOffset?: number;
    };

    if (!clipId && !projectId) {
      return NextResponse.json(
        { error: "Either clipId or projectId is required" },
        { status: 400 },
      );
    }

    // Check if we have the thumbnail generation endpoint configured
    if (!env.THUMBNAIL_GENERATION_ENDPOINT) {
      console.log(
        "Thumbnail generation endpoint not configured, using fallback...",
      );
      return NextResponse.json(
        { error: "Thumbnail generation service not available" },
        { status: 503 },
      );
    }

    let s3Key: string;
    let targetId: string;
    let targetType: "clip" | "project";

    if (clipId) {
      // Get clip info
      const clip = await db.clip.findFirst({
        where: { id: clipId, userId: session.user.id },
      });

      if (!clip) {
        return NextResponse.json({ error: "Clip not found" }, { status: 404 });
      }

      s3Key = clip.s3Key;
      targetId = clipId;
      targetType = "clip";
    } else if (projectId) {
      // Get project info
      const project = await db.uploadedFile.findFirst({
        where: { id: projectId, userId: session.user.id },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }

      s3Key = project.s3Key;
      targetId = projectId;
      targetType = "project";
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Generate signed URL for the video
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const { S3Client, GetObjectCommand, PutObjectCommand } = await import(
      "@aws-sdk/client-s3"
    );

    const s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Get signed URL for the video
    const getVideoCommand = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
    });

    const videoUrl = await getSignedUrl(s3Client, getVideoCommand, {
      expiresIn: 3600,
    });

    // Call the backend thumbnail generation endpoint
    const response = await fetch(env.THUMBNAIL_GENERATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`,
      },
      body: JSON.stringify({
        video_url: videoUrl,
        time_offset: timeOffset,
        width: 480,
        height: 270,
        output_format: "jpeg",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Thumbnail generation failed: ${response.status} - ${errorText}`,
      );

      // If the Modal endpoint fails, return an error response
      console.log("Modal endpoint failed, thumbnail generation unavailable");
      return NextResponse.json(
        {
          error: "Thumbnail generation service unavailable",
          details: errorText,
        },
        { status: 503 },
      );
    }

    // Get the thumbnail as a buffer
    const thumbnailBuffer = await response.arrayBuffer();

    // Upload thumbnail to S3
    const thumbnailKey = `thumbnails/${targetType}s/${targetId}/thumbnail_${Date.now()}.jpeg`;

    const putCommand = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: thumbnailKey,
      Body: new Uint8Array(thumbnailBuffer),
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000", // Cache for 1 year
    });

    await s3Client.send(putCommand);

    // Generate the public URL for the thumbnail
    const thumbnailUrl = `https://${env.S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${thumbnailKey}`;

    // Update the database with the new thumbnail URL
    if (targetType === "clip") {
      await db.clip.update({
        where: { id: targetId },
        data: { thumbnailUrl },
      });
    } else {
      await db.uploadedFile.update({
        where: { id: targetId },
        data: { thumbnailUrl },
      });
    }

    return NextResponse.json({
      success: true,
      thumbnailUrl,
    });
  } catch (error) {
    console.error("Error extracting thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to extract thumbnail" },
      { status: 500 },
    );
  }
}
