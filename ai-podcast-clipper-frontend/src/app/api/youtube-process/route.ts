import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtube_url, chunk_config } = body;

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

    // Call the Modal endpoint for processing
    const processEndpoint = process.env.NEXT_PUBLIC_YOUTUBE_PROCESS_ENDPOINT;
    const authToken = process.env.PROCESS_VIDEO_ENDPOINT_AUTH;

    if (!processEndpoint) {
      return NextResponse.json(
        {
          success: false,
          message: "YouTube processing endpoint not configured",
        },
        { status: 500 },
      );
    }

    console.log(`Processing video: ${youtube_url}`);
    console.log(`Using endpoint: ${processEndpoint}`);
    console.log(`Chunk config:`, chunk_config);

    const response = await fetch(processEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken ?? "12341234"}`,
      },
      body: JSON.stringify({
        youtube_url: youtube_url,
        chunk_config: chunk_config ?? {
          method: "minutes",
          minutesPerChunk: 5,
          totalChunks: 1,
        },
      }),
    });

    if (!response.ok) {
      console.error(
        `Modal processing endpoint error: ${response.status} ${response.statusText}`,
      );
      const errorText = await response.text();
      console.error("Error response:", errorText);

      return NextResponse.json(
        {
          success: false,
          message: `Failed to process video: ${response.status}`,
        },
        { status: response.status },
      );
    }

    const result = await response.json();
    console.log("Processing result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in youtube-process API route:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
