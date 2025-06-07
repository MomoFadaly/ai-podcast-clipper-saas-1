import { type NextRequest } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify user owns this project
  const project = await db.uploadedFile.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    select: {
      id: true,
      status: true,
      displayName: true,
      processingProgress: true,
    },
  });

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial status
      const sendUpdate = (status: string, data?: Record<string, unknown>) => {
        const message = `data: ${JSON.stringify({
          projectId,
          status,
          timestamp: new Date().toISOString(),
          ...data,
        })}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send initial status
      sendUpdate(project.status, {
        displayName: project.displayName,
        processingProgress: project.processingProgress,
      });

      // Poll for status changes every 2 seconds
      const interval = setInterval(async () => {
        try {
          const updatedProject = await db.uploadedFile.findFirst({
            where: {
              id: projectId,
              userId: session.user.id,
            },
            select: {
              status: true,
              displayName: true,
              updatedAt: true,
              processingProgress: true,
            },
          });

          if (updatedProject) {
            sendUpdate(updatedProject.status, {
              displayName: updatedProject.displayName,
              updatedAt: updatedProject.updatedAt,
              processingProgress: updatedProject.processingProgress,
            });

            // Close stream when processing is complete
            if (
              updatedProject.status === "processed" ||
              updatedProject.status === "failed"
            ) {
              // Send final status update with the actual status and final flag
              sendUpdate(updatedProject.status, {
                final: true,
                displayName: updatedProject.displayName,
                updatedAt: updatedProject.updatedAt,
                processingProgress: updatedProject.processingProgress,
              });
              clearInterval(interval);
              controller.close();
            }
          }
        } catch (error) {
          console.error("Error polling project status:", error);
          clearInterval(interval);
          controller.close();
        }
      }, 2000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
