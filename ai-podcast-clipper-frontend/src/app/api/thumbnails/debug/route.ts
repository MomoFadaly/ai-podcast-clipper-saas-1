import { auth } from "~/server/auth";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testVideoUrl, timeOffset = 5 } = (await request.json()) as {
      testVideoUrl?: string;
      timeOffset?: number;
    };

    console.log("=== THUMBNAIL DEBUG TEST ===");
    console.log("Endpoint:", env.THUMBNAIL_GENERATION_ENDPOINT);
    console.log(
      "Auth token:",
      env.PROCESS_VIDEO_ENDPOINT_AUTH ? "CONFIGURED" : "MISSING",
    );
    console.log("Test video URL:", testVideoUrl);
    console.log("Time offset:", timeOffset);

    if (!env.THUMBNAIL_GENERATION_ENDPOINT) {
      return NextResponse.json(
        { error: "Thumbnail generation endpoint not configured" },
        { status: 503 },
      );
    }

    // Use a simple test video URL if none provided
    const videoUrl =
      testVideoUrl ??
      "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4";

    console.log("Calling Modal endpoint with video URL:", videoUrl);

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

    console.log("Modal response status:", response.status);
    console.log(
      "Modal response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Modal thumbnail generation failed: ${response.status} - ${errorText}`,
      );

      return NextResponse.json({
        success: false,
        error: errorText,
        status: response.status,
        endpoint: env.THUMBNAIL_GENERATION_ENDPOINT,
      });
    }

    // Check if we got image data
    const contentType = response.headers.get("content-type");
    console.log("Response content type:", contentType);

    if (!contentType?.startsWith("image/")) {
      const responseText = await response.text();
      console.error("Expected image but got:", contentType, responseText);

      return NextResponse.json({
        success: false,
        error: "Expected image response but got: " + contentType,
        responseText,
      });
    }

    // Get the thumbnail as a buffer
    const thumbnailBuffer = await response.arrayBuffer();
    console.log("Thumbnail buffer size:", thumbnailBuffer.byteLength, "bytes");

    if (thumbnailBuffer.byteLength === 0) {
      return NextResponse.json({
        success: false,
        error: "Received empty thumbnail data",
      });
    }

    console.log("✅ Thumbnail generated successfully!");

    return NextResponse.json({
      success: true,
      message: "Thumbnail generated successfully",
      thumbnailSize: thumbnailBuffer.byteLength,
      contentType,
      endpoint: env.THUMBNAIL_GENERATION_ENDPOINT,
    });
  } catch (error) {
    console.error("Error in thumbnail debug test:", error);
    return NextResponse.json(
      {
        error: "Failed to test thumbnail generation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
