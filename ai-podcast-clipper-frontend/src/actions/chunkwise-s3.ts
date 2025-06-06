"use server";

import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { v4 as uuidv4 } from "uuid";
import { generateChunkwiseS3Key } from "~/lib/s3-utils";

// Initialize S3 client (reusing existing configuration)
function getS3Client() {
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Create video record and get metadata for processing (no file upload for YouTube URLs)
export async function createVideoRecord(_videoInfo: {
  youtubeUrl: string;
  youtubeVideoId: string;
  title?: string;
  description?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // For now, we'll need to adapt this to work with Supabase instead of Prisma
  // This is a placeholder structure - you'll need to implement the actual Supabase calls
  const videoId = uuidv4();

  // Generate S3 paths for this video
  const videoS3Key = generateChunkwiseS3Key(`videos/${videoId}/original.mp4`);
  const thumbnailS3Key = generateChunkwiseS3Key(
    `videos/${videoId}/thumbnails/video-thumb.jpg`,
  );

  return {
    videoId,
    videoS3Key,
    thumbnailS3Key,
    success: true,
  };
}

// Generate signed URL for uploading thumbnails
export async function generateThumbnailUploadUrl(
  videoId: string,
  thumbnailType: "video" | "chunk",
  chunkNumber?: number,
): Promise<{
  success: boolean;
  signedUrl: string;
  key: string;
}> {
  const s3Client = getS3Client();

  let key: string;
  if (thumbnailType === "video") {
    key = generateChunkwiseS3Key(
      `videos/${videoId}/thumbnails/video-thumb.jpg`,
    );
  } else {
    key = generateChunkwiseS3Key(
      `videos/${videoId}/thumbnails/chunk-${chunkNumber}-thumb.jpg`,
    );
  }

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: "image/jpeg",
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    success: true,
    signedUrl,
    key,
  };
}

// Get signed URL for downloading original video (for backend processing)
export async function getVideoDownloadUrl(
  s3Key: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const s3Client = getS3Client();

    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    return { success: true, url: signedUrl };
  } catch (error) {
    console.error("Error generating video download URL:", error);
    return { success: false, error: "Failed to generate download URL." };
  }
}

// Upload file directly to S3 (for backend use or generated thumbnails)
export async function uploadToS3(
  key: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<{ success: boolean; error?: string; s3Key?: string }> {
  try {
    const s3Client = getS3Client();
    const s3Prefix: string = env.CHUNKWISE_S3_PREFIX ?? "chunkwise/";
    const finalKey = key.startsWith(s3Prefix)
      ? key
      : generateChunkwiseS3Key(key);

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: finalKey,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    return { success: true, s3Key: finalKey };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return { success: false, error: "Failed to upload to S3" };
  }
}

// Generate signed URL for viewing thumbnails (for UI display)
export async function getThumbnailSignedUrl(
  thumbnailUrl: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!thumbnailUrl) {
    return { success: false, error: "No thumbnail URL provided" };
  }

  try {
    // Accept either a full S3 URL or just the S3 key
    let s3Key: string;
    if (thumbnailUrl.startsWith("http")) {
      const url = new URL(thumbnailUrl);
      s3Key = url.pathname.substring(1); // Remove leading slash
    } else {
      s3Key = thumbnailUrl;
    }

    const s3Client = getS3Client();

    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour access
    });

    return { success: true, url: signedUrl };
  } catch (error) {
    console.error("Error generating thumbnail signed URL:", error);
    return { success: false, error: "Failed to generate signed URL" };
  }
}
