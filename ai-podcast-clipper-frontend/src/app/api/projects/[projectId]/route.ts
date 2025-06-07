import { auth } from "~/server/auth";
import { db } from "~/server/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = params;

    // First check if the project exists and belongs to the user
    const existingProject = await db.uploadedFile.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 },
      );
    }

    // Log the deletion attempt
    console.log(
      `User ${session.user.id} attempting to delete project ${projectId}`,
    );

    // Delete the project - cascading deletes should handle related records
    await db.uploadedFile.delete({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    console.log(`Successfully deleted project ${projectId}`);

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/projects/[projectId]:", error);

    // Handle specific Prisma errors
    if (typeof error === "object" && error !== null && "code" in error) {
      const prismaError = error as { code: string; meta?: unknown };
      console.error("Prisma error code:", prismaError.code);
      console.error("Prisma error meta:", prismaError.meta);

      // Handle foreign key constraint violations
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          { error: "Cannot delete project due to related data constraints" },
          { status: 409 },
        );
      }

      // Handle record not found
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Failed to delete project",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
