import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  try {
    console.log("=== SIMPLE THUMBNAIL TEST (NO AUTH) ===");
    console.log("Endpoint:", env.THUMBNAIL_GENERATION_ENDPOINT);
    console.log(
      "Auth token:",
      env.PROCESS_VIDEO_ENDPOINT_AUTH ? "CONFIGURED" : "MISSING",
    );

    if (!env.THUMBNAIL_GENERATION_ENDPOINT) {
      return NextResponse.json(
        { error: "Thumbnail generation endpoint not configured" },
        { status: 503 },
      );
    }

    // Use a simple test video URL
    const videoUrl =
      "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4";

    console.log("Calling Modal endpoint with test video...");

    // Call the backend thumbnail generation endpoint
    const response = await fetch(env.THUMBNAIL_GENERATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PROCESS_VIDEO_ENDPOINT_AUTH}`,
      },
      body: JSON.stringify({
        video_url: videoUrl,
        time_offset: 5,
        width: 480,
        height: 270,
        output_format: "jpeg",
      }),
    });

    console.log("Modal response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Modal failed: ${response.status} - ${errorText}`);

      return NextResponse.json({
        success: false,
        error: errorText,
        status: response.status,
      });
    }

    // Check content type
    const contentType = response.headers.get("content-type");
    console.log("Response content type:", contentType);

    if (!contentType?.startsWith("image/")) {
      const responseText = await response.text();
      return NextResponse.json({
        success: false,
        error: "Expected image but got: " + contentType,
        responseText,
      });
    }

    const thumbnailBuffer = await response.arrayBuffer();
    console.log(
      "✅ Success! Thumbnail size:",
      thumbnailBuffer.byteLength,
      "bytes",
    );

    return NextResponse.json({
      success: true,
      message: "Thumbnail generated successfully",
      thumbnailSize: thumbnailBuffer.byteLength,
      contentType,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
