import { type AccessLevel, type Permission } from "@prisma/client";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

// Types for access control responses
export interface AccessCheckResult {
  hasAccess: boolean;
  permission?: Permission;
  accessLevel?: AccessLevel;
  isOwner: boolean;
  reason?: string;
}

export interface ContentAccess {
  id: string;
  name: string;
  contentType: "project" | "track";
  accessLevel: AccessLevel;
  permission: Permission;
  isOwner: boolean;
  sharedBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  sharedAt?: Date;
  expiresAt?: Date | null;
}

/**
 * Check if a user has access to specific content
 */
export async function checkAccess(
  contentType: "project" | "track",
  contentId: string,
  userId: string,
  requiredPermission: Permission = "VIEW"
): Promise<AccessCheckResult> {
  try {
    // First check if user owns the content
    if (contentType === "project") {
      const project = await db.uploadedFile.findFirst({
        where: { id: contentId, userId },
      });
      
      if (project) {
        return {
          hasAccess: true,
          permission: "COLLABORATE", // Owners have full permissions
          accessLevel: "PRIVATE",
          isOwner: true,
        };
      }
    } else {
      const track = await db.track.findFirst({
        where: { id: contentId, userId },
      });
      
      if (track) {
        return {
          hasAccess: true,
          permission: "COLLABORATE",
          accessLevel: "PRIVATE", 
          isOwner: true,
        };
      }
    }

    // Check shared access
    
    let shareQuery;
    if (contentType === "project") {
      shareQuery = db.projectShare.findFirst({
        where: {
          projectId: contentId,
          OR: [
            { sharedWith: userId }, // Direct email share
            { 
              accessLevel: "PUBLIC",
              shareToken: { not: null }
            }, // Public share
            {
              group: {
                members: {
                  some: { userId }
                }
              }
            } // Group share
          ],
          isActive: true,
          AND: [
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          ]
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          group: {
            select: { id: true, name: true }
          }
        }
      });
    } else {
      shareQuery = db.trackShare.findFirst({
        where: {
          trackId: contentId,
          OR: [
            { sharedWith: userId },
            { 
              accessLevel: "PUBLIC",
              shareToken: { not: null }
            },
            {
              group: {
                members: {
                  some: { userId }
                }
              }
            }
          ],
          isActive: true,
          AND: [
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            }
          ]
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          group: {
            select: { id: true, name: true }
          }
        }
      });
    }

    const share = await shareQuery;

    if (!share) {
      return {
        hasAccess: false,
        isOwner: false,
        reason: "No access granted to this content"
      };
    }

    // Check if user has required permission level
    const permissionLevels = ["VIEW", "COPY", "COLLABORATE"];
    const userPermissionIndex = permissionLevels.indexOf(share.permissions);
    const requiredPermissionIndex = permissionLevels.indexOf(requiredPermission);

    if (userPermissionIndex < requiredPermissionIndex) {
      return {
        hasAccess: false,
        isOwner: false,
        reason: `Insufficient permissions. Required: ${requiredPermission}, granted: ${share.permissions}`
      };
    }

    return {
      hasAccess: true,
      permission: share.permissions,
      accessLevel: share.accessLevel,
      isOwner: false,
    };

  } catch (error) {
    console.error("Error checking access:", error);
    return {
      hasAccess: false,
      isOwner: false,
      reason: "Error checking access permissions"
    };
  }
}

/**
 * Get all projects accessible to a user (owned + shared)
 */
export async function getUserAccessibleProjects(
  userId: string,
  includeShared = true
): Promise<ContentAccess[]> {
  try {
    const accessibleContent: ContentAccess[] = [];

    // Get owned projects
    const ownedProjects = await db.uploadedFile.findMany({
      where: { userId },
      select: {
        id: true,
        displayName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });

    for (const project of ownedProjects) {
      accessibleContent.push({
        id: project.id,
        name: project.displayName || "Untitled Project",
        contentType: "project",
        accessLevel: "PRIVATE",
        permission: "COLLABORATE",
        isOwner: true,
      });
    }

    if (!includeShared) {
      return accessibleContent;
    }

    // Get shared projects
    const sharedProjects = await db.projectShare.findMany({
      where: {
        OR: [
          { sharedWith: userId },
          {
            group: {
              members: {
                some: { userId }
              }
            }
          }
        ],
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            displayName: true,
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    for (const share of sharedProjects) {
      accessibleContent.push({
        id: share.project.id,
        name: share.project.displayName || "Untitled Project",
        contentType: "project",
        accessLevel: share.accessLevel,
        permission: share.permissions,
        isOwner: false,
        sharedBy: share.owner,
        sharedAt: share.createdAt,
        expiresAt: share.expiresAt,
      });
    }

    return accessibleContent;

  } catch (error) {
    console.error("Error getting accessible projects:", error);
    return [];
  }
}

/**
 * Get all tracks accessible to a user (owned + shared)
 */
export async function getUserAccessibleTracks(
  userId: string,
  includeShared = true
): Promise<ContentAccess[]> {
  try {
    const accessibleContent: ContentAccess[] = [];

    // Get owned tracks
    const ownedTracks = await db.track.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });

    for (const track of ownedTracks) {
      accessibleContent.push({
        id: track.id,
        name: track.name,
        contentType: "track",
        accessLevel: "PRIVATE",
        permission: "COLLABORATE",
        isOwner: true,
      });
    }

    if (!includeShared) {
      return accessibleContent;
    }

    // Get shared tracks
    const sharedTracks = await db.trackShare.findMany({
      where: {
        OR: [
          { sharedWith: userId },
          {
            group: {
              members: {
                some: { userId }
              }
            }
          }
        ],
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        ]
      },
      include: {
        track: {
          select: {
            id: true,
            name: true,
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    for (const share of sharedTracks) {
      accessibleContent.push({
        id: share.track.id,
        name: share.track.name,
        contentType: "track",
        accessLevel: share.accessLevel,
        permission: share.permissions,
        isOwner: false,
        sharedBy: share.owner,
        sharedAt: share.createdAt,
        expiresAt: share.expiresAt,
      });
    }

    return accessibleContent;

  } catch (error) {
    console.error("Error getting accessible tracks:", error);
    return [];
  }
}

/**
 * Check if user can perform a specific action on content
 */
export async function canUserPerformAction(
  userId: string,
  contentType: "project" | "track",
  contentId: string,
  action: "view" | "copy" | "share" | "edit" | "delete"
): Promise<boolean> {
  try {
    // Define permission requirements for each action
    const actionPermissions: Record<string, Permission> = {
      view: "VIEW",
      copy: "COPY",
      share: "VIEW", // Can share if can view (owner check done separately)
      edit: "COLLABORATE",
      delete: "COLLABORATE",
    };

    const requiredPermission = actionPermissions[action];
    if (!requiredPermission) {
      return false;
    }

    const access = await checkAccess(contentType, contentId, userId, requiredPermission);
    
    // Special cases for certain actions
    if (action === "share" || action === "delete") {
      // Only owners can share or delete
      return access.isOwner;
    }
    
    if (action === "edit") {
      // Only owners can edit (for now)
      return access.isOwner;
    }

    return access.hasAccess;

  } catch (error) {
    console.error("Error checking action permission:", error);
    return false;
  }
}

/**
 * Get content by public share token (no authentication required)
 */
export async function getContentByShareToken(
  shareToken: string
): Promise<ContentAccess | null> {
  try {
    // Try project share first
    const projectShare = await db.projectShare.findFirst({
      where: {
        shareToken,
        accessLevel: "PUBLIC",
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            displayName: true,
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (projectShare) {
      return {
        id: projectShare.project.id,
        name: projectShare.project.displayName || "Untitled Project",
        contentType: "project",
        accessLevel: projectShare.accessLevel,
        permission: projectShare.permissions,
        isOwner: false,
        sharedBy: projectShare.owner,
        sharedAt: projectShare.createdAt,
        expiresAt: projectShare.expiresAt,
      };
    }

    // Try track share
    const trackShare = await db.trackShare.findFirst({
      where: {
        shareToken,
        accessLevel: "PUBLIC",
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        ]
      },
      include: {
        track: {
          select: {
            id: true,
            name: true,
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (trackShare) {
      return {
        id: trackShare.track.id,
        name: trackShare.track.name,
        contentType: "track",
        accessLevel: trackShare.accessLevel,
        permission: trackShare.permissions,
        isOwner: false,
        sharedBy: trackShare.owner,
        sharedAt: trackShare.createdAt,
        expiresAt: trackShare.expiresAt,
      };
    }

    return null;

  } catch (error) {
    console.error("Error getting content by share token:", error);
    return null;
  }
}

/**
 * Get the current user's ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Require authentication and return user ID, throw if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
}