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
  clips: (projectId: string, options?: any) =>
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
    staleTime: 1000 * 60 * 5, // 5 minutes for project details
  });
}

// Hook for fetching project clips with pagination
export function useProjectClips(
  projectId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeTranscription?: boolean;
  },
) {
  return useQuery({
    queryKey: queryKeys.clips(projectId, options),
    queryFn: () => getProjectClips(projectId, options),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 3, // 3 minutes for clips
  });
}
