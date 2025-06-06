import { auth } from "~/server/auth";
import { type NextRequest, NextResponse } from "next/server";
import {
  generateSingleThumbnail,
  generateProjectAndClipThumbnails,
  batchGenerateThumbnails,
} from "~/actions/thumbnails";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await request.json()) as {
      type: "single" | "project_all" | "batch_projects";
      projectId?: string;
      clipId?: string;
      videoS3Key?: string;
      projectIds?: string[];
      timeOffset?: number;
    };

    const { type, projectId, clipId, videoS3Key, projectIds, timeOffset } =
      body;

    console.log("=== THUMBNAIL GENERATION API V2 ===");
    console.log("Request type:", type);
    console.log("User ID:", userId);
    console.log("Project ID:", projectId);
    console.log("Clip ID:", clipId);
    console.log("Video S3 Key (for single):", videoS3Key);
    console.log("Project IDs (for batch):", projectIds);
    console.log("Time offset:", timeOffset);

    switch (type) {
      case "single": {
        if (!videoS3Key) {
          return NextResponse.json(
            { error: "videoS3Key is required for single thumbnail generation" },
            { status: 400 },
          );
        }
        if (!projectId && !clipId) {
          return NextResponse.json(
            { error: "Either projectId or clipId is required" },
            { status: 400 },
          );
        }
        if (projectId && clipId) {
          return NextResponse.json(
            { error: "Cannot specify both projectId and clipId" },
            { status: 400 },
          );
        }

        const result = await generateSingleThumbnail({
          projectId,
          clipId,
          videoS3Key,
          timeOffset,
        });

        if (!result.success) {
          return NextResponse.json(
            { error: result.error ?? "Failed to generate single thumbnail" },
            { status: 500 },
          );
        }
        return NextResponse.json({
          success: true,
          type: "single",
          thumbnailUrl: result.thumbnailUrl,
        });
      }

      case "project_all": {
        if (!projectId) {
          return NextResponse.json(
            {
              error:
                "projectId is required for project_all thumbnail generation",
            },
            { status: 400 },
          );
        }

        const result = await generateProjectAndClipThumbnails(
          projectId,
          userId,
        );

        if (!result.success) {
          return NextResponse.json(
            { error: result.error ?? "Failed to generate project thumbnails" },
            { status: 500 },
          );
        }
        return NextResponse.json({
          success: true,
          type: "project_all",
          results: result.results,
        });
      }

      case "batch_projects": {
        if (
          !projectIds ||
          !Array.isArray(projectIds) ||
          projectIds.length === 0
        ) {
          return NextResponse.json(
            {
              error:
                "projectIds array is required for batch_projects generation",
            },
            { status: 400 },
          );
        }
        if (projectIds.length > 10) {
          return NextResponse.json(
            { error: "Maximum 10 projects allowed for batch processing" },
            { status: 400 },
          );
        }

        const results = await batchGenerateThumbnails(projectIds, userId);

        return NextResponse.json({
          success: true,
          type: "batch_projects",
          results,
          processedCount: projectIds.length,
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid type. Must be 'single', 'project_all', or 'batch_projects'",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error in thumbnail generation API:", error);
    return NextResponse.json(
      {
        error: "Thumbnail generation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
