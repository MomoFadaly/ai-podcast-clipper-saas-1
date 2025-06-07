import { db } from "~/server/db";

export interface StatusNotification {
  projectId: string;
  status: string;
  message?: string;
  progressPercentage?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Send a real-time status notification by updating the database.
 * The SSE endpoint polls the database for changes, so this will trigger
 * a real-time update to connected clients.
 */
export async function sendStatusNotification({
  projectId,
  status,
  message,
  progressPercentage,
  metadata,
}: StatusNotification) {
  try {
    console.log(
      `📡 Sending real-time notification for ${projectId}: ${status}${progressPercentage !== undefined ? ` (${progressPercentage}%)` : ""}`,
    );

    // Update the database record - this will be picked up by the SSE polling
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Update processing progress if provided
    if (progressPercentage !== undefined) {
      updateData.processingProgress = Math.round(progressPercentage);
    }

    // Only update displayName if provided in metadata
    if (metadata?.displayName) {
      updateData.displayName = metadata.displayName as string;
    }

    await db.uploadedFile.update({
      where: { id: projectId },
      data: updateData,
    });

    console.log(`✅ Real-time notification sent for ${projectId}`);
  } catch (error) {
    console.error(
      `❌ Failed to send real-time notification for ${projectId}:`,
      error,
    );
  }
}

/**
 * Send multiple status notifications for batch operations
 */
export async function sendBatchStatusNotifications(
  notifications: StatusNotification[],
) {
  await Promise.all(
    notifications.map((notification) => sendStatusNotification(notification)),
  );
}
