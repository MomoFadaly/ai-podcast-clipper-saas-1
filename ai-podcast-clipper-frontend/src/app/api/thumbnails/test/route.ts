import { auth } from "~/server/auth";
import { NextResponse } from "next/server";
import { env } from "~/env";

export async function GET() {
  try {
    const session = await auth();

    const testInfo = {
      hasSession: !!session?.user?.id,
      userId: session?.user?.id,
      hasThumbailEndpoint: !!env.THUMBNAIL_GENERATION_ENDPOINT,
      thumbnailEndpoint: env.THUMBNAIL_GENERATION_ENDPOINT || "NOT_CONFIGURED",
      hasAuth: !!env.PROCESS_VIDEO_ENDPOINT_AUTH,
      authToken: env.PROCESS_VIDEO_ENDPOINT_AUTH
        ? "CONFIGURED"
        : "NOT_CONFIGURED",
      hasS3Config: !!(
        env.AWS_ACCESS_KEY_ID &&
        env.AWS_SECRET_ACCESS_KEY &&
        env.S3_BUCKET_NAME
      ),
      s3Bucket: env.S3_BUCKET_NAME || "NOT_CONFIGURED",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Thumbnail generation test endpoint",
      config: testInfo,
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
