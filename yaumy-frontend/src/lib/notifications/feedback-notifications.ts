import { db } from "~/server/db";
import type { FeedbackStatus } from "@prisma/client";

interface NotificationData {
  feedbackId: string;
  userId: string;
  type: 'status_change' | 'comment_added' | 'assignment' | 'escalation';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// Send notification to user
export async function sendFeedbackNotification(data: NotificationData) {
  try {
    // In a real implementation, you might:
    // - Send email via service like SendGrid, Resend, etc.
    // - Send push notification
    // - Create in-app notification
    // - Send webhook to external service

    // For now, we'll create an in-app notification record
    await db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        read: false,
      },
    });

    console.log(`Notification sent to user ${data.userId}: ${data.title}`);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

// Notify user when feedback status changes
export async function notifyStatusChange(
  feedbackId: string,
  oldStatus: FeedbackStatus,
  newStatus: FeedbackStatus,
  changedBy?: string
) {
  try {
    const feedback = await db.feedbackRequest.findUnique({
      where: { id: feedbackId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!feedback) return;

    const statusMessages = {
      OPEN: "Your feedback has been submitted and is awaiting review.",
      IN_PROGRESS: "We&apos;ve started working on your feedback request.",
      IN_REVIEW: "Your feedback is now under review by our team.",
      TESTING: "Your feedback is currently being tested by our team.",
      COMPLETED: "Your feedback has been implemented! Thank you for helping us improve.",
      CLOSED: "Your feedback request has been closed.",
      DUPLICATE: "This feedback is similar to an existing request we&apos;re already tracking.",
      WONT_FIX: "Unfortunately, we won&apos;t be implementing this request at this time.",
      NEEDS_INFO: "We need more information about your feedback request.",
    };

    await sendFeedbackNotification({
      feedbackId,
      userId: feedback.userId,
      type: 'status_change',
      title: `Feedback Status Updated: ${feedback.title}`,
      message: statusMessages[newStatus] || `Your feedback status has been updated to ${newStatus}.`,
      actionUrl: `/dashboard/feedback/${feedbackId}`,
      metadata: {
        oldStatus,
        newStatus,
        changedBy,
      },
    });
  } catch (error) {
    console.error("Failed to notify status change:", error);
  }
}

// Notify user when someone comments on their feedback
export async function notifyNewComment(
  feedbackId: string,
  commentAuthor: string,
  commentPreview: string
) {
  try {
    const feedback = await db.feedbackRequest.findUnique({
      where: { id: feedbackId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!feedback) return;

    await sendFeedbackNotification({
      feedbackId,
      userId: feedback.userId,
      type: 'comment_added',
      title: `New comment on: ${feedback.title}`,
      message: `${commentAuthor} commented: "${commentPreview}"`,
      actionUrl: `/dashboard/feedback/${feedbackId}#comments`,
      metadata: {
        commentAuthor,
        commentPreview,
      },
    });
  } catch (error) {
    console.error("Failed to notify new comment:", error);
  }
}

// Notify team member when assigned to feedback
export async function notifyAssignment(
  feedbackId: string,
  assigneeId: string,
  assignedBy: string
) {
  try {
    const feedback = await db.feedbackRequest.findUnique({
      where: { id: feedbackId },
      select: { id: true, title: true, type: true, priority: true },
    });

    if (!feedback) return;

    await sendFeedbackNotification({
      feedbackId,
      userId: assigneeId,
      type: 'assignment',
      title: `Feedback Assigned: ${feedback.title}`,
      message: `You&apos;ve been assigned a ${feedback.priority?.toLowerCase() || 'normal'} priority ${feedback.type.toLowerCase().replace('_', ' ')} by ${assignedBy}.`,
      actionUrl: `/dashboard/admin/feedback/${feedbackId}`,
      metadata: {
        assignedBy,
        priority: feedback.priority,
        type: feedback.type,
      },
    });
  } catch (error) {
    console.error("Failed to notify assignment:", error);
  }
}

// Notify when high-priority feedback needs escalation
export async function notifyEscalation(
  feedbackId: string,
  reason: string,
  escalatedTo: string[]
) {
  try {
    const feedback = await db.feedbackRequest.findUnique({
      where: { id: feedbackId },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!feedback) return;

    for (const userId of escalatedTo) {
      await sendFeedbackNotification({
        feedbackId,
        userId,
        type: 'escalation',
        title: `Urgent: Feedback Escalation Required`,
        message: `${feedback.priority} priority feedback from ${feedback.user.name || 'Anonymous'} needs attention: ${reason}`,
        actionUrl: `/dashboard/admin/feedback/${feedbackId}`,
        metadata: {
          reason,
          priority: feedback.priority,
          userEmail: feedback.user.email,
        },
      });
    }
  } catch (error) {
    console.error("Failed to notify escalation:", error);
  }
}

// Batch notify multiple users (e.g., for announcements)
export async function batchNotifyUsers(
  userIds: string[],
  notification: Omit<NotificationData, 'userId' | 'feedbackId'>
) {
  try {
    const notifications = userIds.map(userId => ({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      read: false,
    }));

    await db.notification.createMany({
      data: notifications,
    });

    console.log(`Batch notification sent to ${userIds.length} users: ${notification.title}`);
  } catch (error) {
    console.error("Failed to send batch notification:", error);
  }
}

// Get unread notification count for user
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    return await db.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  } catch (error) {
    console.error("Failed to get unread notification count:", error);
    return 0;
  }
}

// Mark notification as read
export async function markNotificationRead(notificationId: string, userId: string) {
  try {
    await db.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user can only mark their own notifications as read
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

// Get user notifications with pagination
export async function getUserNotifications(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  } = {}
) {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    const notifications = await db.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    const totalCount = await db.notification.count({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    console.error("Failed to get user notifications:", error);
    const { limit = 20 } = options;
    return {
      notifications: [],
      pagination: {
        page: 1,
        limit,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
}