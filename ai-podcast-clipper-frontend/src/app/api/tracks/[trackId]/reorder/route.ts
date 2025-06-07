import { NextRequest, NextResponse } from "next/server";
import { updateProjectOrder } from "~/actions/tracks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> },
) {
  try {
    const { trackId } = await params;
    const body = await request.json();
    const { projectOrders } = body;

    if (!projectOrders || !Array.isArray(projectOrders)) {
      return NextResponse.json(
        { error: "Invalid project orders data" },
        { status: 400 },
      );
    }

    // Validate the structure of projectOrders
    for (const item of projectOrders) {
      if (!item.projectId || typeof item.order !== "number") {
        return NextResponse.json(
          { error: "Invalid project order item structure" },
          { status: 400 },
        );
      }
    }

    const success = await updateProjectOrder(trackId, projectOrders);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update project order" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in reorder API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
