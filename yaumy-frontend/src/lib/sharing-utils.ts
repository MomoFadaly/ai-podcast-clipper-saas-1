import { nanoid } from "nanoid";
import { type AccessLevel, type Permission } from "@prisma/client";

/**
 * Generate a secure share token for public links
 */
export function createShareToken(): string {
  return nanoid(16); // 16-character URL-safe token
}

/**
 * Generate a secure invite code for groups (shorter for easier sharing)
 */
export function createGroupInviteCode(): string {
  return nanoid(8).toUpperCase(); // 8-character uppercase code
}

/**
 * Build a complete share URL for public content access
 */
export function buildShareUrl(shareToken: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/shared/${shareToken}`;
}

/**
 * Build a group invite URL
 */
export function buildGroupInviteUrl(inviteCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/groups/join/${inviteCode}`;
}

/**
 * Parse expiration duration string into Date object
 * Supports: "1d", "7d", "30d", "90d", "never"
 */
export function parseExpirationDuration(duration: string): Date | null {
  if (duration === "never" || !duration) {
    return null;
  }

  const now = new Date();
  const regex = /^(\d+)([dwmy])$/;
  const match = regex.exec(duration);
  
  if (!match) {
    return null;
  }

  const amount = match[1];
  const unit = match[2];
  
  if (!amount || !unit) {
    return null;
  }
  const value = parseInt(amount, 10);

  switch (unit) {
    case "d": // days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case "w": // weeks
      return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
    case "m": // months (approximate)
      return new Date(now.getTime() + value * 30 * 24 * 60 * 60 * 1000);
    case "y": // years
      return new Date(now.getTime() + value * 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

/**
 * Check if a share has expired
 */
export function isShareExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return false; // Never expires
  }
  return new Date() > expiresAt;
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Parse comma/semicolon separated email list
 */
export function parseEmailList(input: string): string[] {
  return input
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email.length > 0 && validateEmail(email));
}

/**
 * Get human-readable description of share configuration
 */
export function getShareDescription(
  accessLevel: string,
  permission: string,
  groupName?: string
): string {
  const permissionText = {
    VIEW: "can view",
    COPY: "can view and copy",
    COLLABORATE: "can view, copy and edit"
  }[permission] || "can view";

  switch (accessLevel) {
    case "EMAIL_SHARED":
      return `Shared via email • Recipients ${permissionText}`;
    case "PUBLIC":
      return `Public link • Anyone with link ${permissionText}`;
    case "GROUP_SHARED":
      return `Shared with ${groupName || "group"} • Members ${permissionText}`;
    default:
      return "Private • Only you can access";
  }
}

/**
 * Sanitize group/share name for display
 */
export function sanitizeName(name: string): string {
  return name.trim().slice(0, 100); // Max 100 characters, trimmed
}

/**
 * Get user initials for avatar display
 */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  
  return name
    .split(" ")
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format relative time for share timestamps
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format expiration time for display
 */
export function formatExpirationTime(expiresAt: Date | null): string {
  if (!expiresAt) {
    return "Never expires";
  }

  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "Expired";
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `Expires in ${diffDays}d`;
  } else if (diffHours > 0) {
    return `Expires in ${diffHours}h`;
  } else if (diffMinutes > 0) {
    return `Expires in ${diffMinutes}m`;
  } else {
    return "Expires soon";
  }
}

/**
 * Generate random colors for group/track visualization
 */
export function generateRandomColor(): string {
  const colors = [
    "#3B82F6", // blue
    "#EF4444", // red
    "#10B981", // green
    "#F59E0B", // amber
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#F97316", // orange
    "#6366F1", // indigo
  ];
  
  const index = Math.floor(Math.random() * colors.length);
  return colors[index] ?? colors[0]!;
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Validate share token format
 */
export function isValidShareToken(token: string): boolean {
  return /^[a-zA-Z0-9_-]{16}$/.test(token);
}

/**
 * Validate group invite code format
 */
export function isValidGroupInviteCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}

/**
 * Get permission level numeric value for comparison
 */
export function getPermissionLevel(permission: Permission): number {
  const levels = { VIEW: 1, COPY: 2, COLLABORATE: 3 };
  return levels[permission] || 0;
}

/**
 * Check if user has sufficient permission level
 */
export function hasPermission(userPermission: Permission, requiredPermission: Permission): boolean {
  return getPermissionLevel(userPermission) >= getPermissionLevel(requiredPermission);
}

/**
 * Get access level color for UI display
 */
export function getAccessLevelColor(accessLevel: AccessLevel): string {
  const colors = {
    PRIVATE: "gray",
    EMAIL_SHARED: "blue", 
    PUBLIC: "green",
    GROUP_SHARED: "purple",
  };
  
  return colors[accessLevel] || "gray";
}

/**
 * Get permission color for UI display
 */
export function getPermissionColor(permission: Permission): string {
  const colors = {
    VIEW: "blue",
    COPY: "green", 
    COLLABORATE: "purple",
  };
  
  return colors[permission] || "blue";
}