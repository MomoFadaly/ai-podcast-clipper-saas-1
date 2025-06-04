import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, message: "URL parameter is required" },
        { status: 400 },
      );
    }

    // Validate YouTube URL
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(url)) {
      return NextResponse.json(
        { success: false, message: "Invalid YouTube URL" },
        { status: 400 },
      );
    }

    // Call the Modal endpoint
    const metadataEndpoint = process.env.NEXT_PUBLIC_YOUTUBE_METADATA_ENDPOINT;
    if (!metadataEndpoint) {
      return NextResponse.json(
        { success: false, message: "YouTube metadata endpoint not configured" },
        { status: 500 },
      );
    }

    console.log(
      `Fetching metadata from: ${metadataEndpoint}?url=${encodeURIComponent(url)}`,
    );

    const response = await fetch(
      `${metadataEndpoint}?url=${encodeURIComponent(url)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `Modal endpoint error: ${response.status} ${response.statusText}`,
      );
      return NextResponse.json(
        {
          success: false,
          message: `Failed to fetch metadata: ${response.status}`,
        },
        { status: response.status },
      );
    }

    const result = await response.json();
    console.log("Modal response:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in youtube-metadata API route:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
