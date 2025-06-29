import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely formats a date to prevent hydration mismatches
 * Returns a consistent format that works for both server and client
 */
export function formatDate(date: string | Date): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Use a consistent, locale-independent format to avoid hydration mismatches
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error: unknown) {
    console.warn(
      "Failed to format date:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return "Invalid date";
  }
}

/**
 * Format duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  
  return `${hours}h`;
}
