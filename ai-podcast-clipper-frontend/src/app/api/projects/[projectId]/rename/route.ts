import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { revalidatePath } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await request.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== "string") {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 },
      );
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Display name cannot be empty" },
        { status: 400 },
      );
    }

    // Verify the user owns the project
    const project = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update the project display name
    const updatedProject = await db.uploadedFile.update({
      where: {
        id: projectId,
      },
      data: {
        displayName: trimmedName,
      },
    });

    // Revalidate relevant pages
    revalidatePath("/dashboard/tracks");
    revalidatePath("/dashboard/library");
    revalidatePath(`/dashboard/projects/${projectId}`);

    return NextResponse.json({
      success: true,
      project: {
        id: updatedProject.id,
        displayName: updatedProject.displayName,
      },
    });
  } catch (error) {
    console.error("Error renaming project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
