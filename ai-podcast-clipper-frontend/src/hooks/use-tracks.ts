"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserTracks,
  getTrackById,
  getTrackProjects,
  getProjectTracks,
  createTrack,
  updateTrack,
  deleteTrack,
  addProjectToTrack,
  removeProjectFromTrack,
  updateProjectOrder,
  type TrackWithStats,
  type TrackSummary,
  type CreateTrackData,
  type UpdateTrackData,
} from "~/actions/tracks";

// Query keys for consistent caching
export const trackQueryKeys = {
  tracks: ["tracks"] as const,
  track: (id: string) => ["tracks", id] as const,
  trackProjects: (trackId: string) => ["tracks", trackId, "projects"] as const,
  projectTracks: (projectId: string) =>
    ["projects", projectId, "tracks"] as const,
};

// Hook for fetching all user tracks
export function useTracks() {
  return useQuery({
    queryKey: trackQueryKeys.tracks,
    queryFn: getUserTracks,
    staleTime: 1000 * 60 * 2, // 2 minutes for tracks list
  });
}

// Hook for fetching a specific track
export function useTrack(trackId: string) {
  return useQuery({
    queryKey: trackQueryKeys.track(trackId),
    queryFn: () => getTrackById(trackId),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 5, // 5 minutes for track details
  });
}

// Hook for fetching projects within a track
export function useTrackProjects(trackId: string) {
  return useQuery({
    queryKey: trackQueryKeys.trackProjects(trackId),
    queryFn: () => getTrackProjects(trackId),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 3, // 3 minutes for track projects
  });
}

// Hook for fetching tracks associated with a project
export function useProjectTracks(projectId: string) {
  return useQuery({
    queryKey: trackQueryKeys.projectTracks(projectId),
    queryFn: () => getProjectTracks(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 3, // 3 minutes for project tracks
  });
}

// Hook for creating a new track
export function useCreateTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTrackData) => createTrack(data),
    onSuccess: () => {
      // Invalidate tracks list to refresh
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.tracks,
      });
    },
  });
}

// Hook for updating a track
export function useUpdateTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trackId,
      data,
    }: {
      trackId: string;
      data: UpdateTrackData;
    }) => updateTrack(trackId, data),
    onSuccess: (_, { trackId }) => {
      // Invalidate specific track and tracks list
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.track(trackId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.tracks,
      });
    },
  });
}

// Hook for deleting a track
export function useDeleteTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) => deleteTrack(trackId),
    onSuccess: () => {
      // Invalidate tracks list and any track-related queries
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.tracks,
      });
      // Also invalidate project tracks since they might have changed
      void queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
    },
  });
}

// Hook for adding a project to a track
export function useAddProjectToTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      trackId,
    }: {
      projectId: string;
      trackId: string;
    }) => addProjectToTrack(projectId, trackId),
    onSuccess: (_, { projectId, trackId }) => {
      // Invalidate affected queries
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.track(trackId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.trackProjects(trackId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.projectTracks(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.tracks,
      });
    },
  });
}

// Hook for removing a project from a track
export function useRemoveProjectFromTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      trackId,
    }: {
      projectId: string;
      trackId: string;
    }) => removeProjectFromTrack(projectId, trackId),
    onSuccess: (_, { projectId, trackId }) => {
      // Invalidate affected queries
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.track(trackId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.trackProjects(trackId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.projectTracks(projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.tracks,
      });
    },
  });
}

// Hook for updating project order within a track
export function useUpdateProjectOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackId,
      projectOrders,
    }: {
      trackId: string;
      projectOrders: { projectId: string; order: number }[];
    }) => {
      const response = await fetch(`/api/tracks/${trackId}/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectOrders }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project order");
      }

      return response.json();
    },
    onSuccess: (_, { trackId }) => {
      // Invalidate and refetch relevant queries
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.trackProjects(trackId),
      });
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.track(trackId),
      });
    },
    onError: (error) => {
      console.error("Failed to update project order:", error);
    },
  });
}

// Hook for renaming a project
export function useRenameProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      displayName,
    }: {
      projectId: string;
      displayName: string;
    }) => {
      const response = await fetch(`/api/projects/${projectId}/rename`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to rename project");
      }

      return response.json();
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate and refetch relevant queries
      void queryClient.invalidateQueries({
        queryKey: trackQueryKeys.tracks,
      });
      void queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      // Invalidate any track projects queries that might contain this project
      queryClient
        .getQueryCache()
        .getAll()
        .forEach((query) => {
          if (
            query.queryKey[0] === "tracks" &&
            query.queryKey[2] === "projects"
          ) {
            void queryClient.invalidateQueries({ queryKey: query.queryKey });
          }
        });
    },
    onError: (error) => {
      console.error("Failed to rename project:", error);
    },
  });
}
