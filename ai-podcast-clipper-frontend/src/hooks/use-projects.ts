"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getUserProjects,
  getProjectById,
  getProjectClips,
} from "~/actions/projects";
import type { ProjectWithStats, ClipWithDetails } from "~/actions/projects";

// Query keys for consistent caching
export const queryKeys = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  clips: (projectId: string, options?: Record<string, unknown>) =>
    ["clips", projectId, options] as const,
};

// Hook for fetching all user projects
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: getUserProjects,
    staleTime: 1000 * 60 * 2, // 2 minutes for projects list
  });
}

// Hook for fetching a specific project
export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProjectById(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes - reasonable for project details
  });
}

// Hook for fetching project clips with pagination and validation
export function useProjectClips(
  projectId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeTranscription?: boolean;
  },
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: queryKeys.clips(projectId, options),
    queryFn: async () => {
      console.log(`🔍 Fetching clips for project ${projectId}...`);
      const clips = await getProjectClips(projectId, options);

      // FRONTEND VALIDATION: Detect missing chunks data that would break UI
      const missingChunks = clips.filter((clip) => !clip.chunks);
      if (missingChunks.length > 0) {
        console.error(
          `🚨 FRONTEND ALERT: ${missingChunks.length} clips missing chunks data!`,
        );
        console.error(
          "This will cause 'No chunks available' to show even when clips exist.",
        );
        console.error(
          "Missing chunks clips:",
          missingChunks.map((c) => c.id),
        );

        // Optional: Could throw error to force retry or show user-friendly error
        // throw new Error(`Critical data missing for ${missingChunks.length} clips`);
      }

      console.log(`✅ Fetched ${clips.length} clips for project ${projectId}`);
      return clips;
    },
    enabled: !!projectId && enabled,
    staleTime: 0, // Consider data immediately stale for faster updates
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes

    // Force refetch on mount and focus to catch missed updates
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Ensure query updates when data changes
    notifyOnChangeProps: "all",
    structuralSharing: false, // Disable structural sharing to force full updates

    // Add retry logic in case of data issues
    retry: (failureCount, error) => {
      // Don't retry if it's a data structure issue
      if (error.message?.includes("Critical data missing")) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2000),
  });
}
