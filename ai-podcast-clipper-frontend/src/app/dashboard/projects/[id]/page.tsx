"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProject, useProjectClips, queryKeys } from "~/hooks/use-projects";
import { useQueryClient } from "@tanstack/react-query";
import { useRealTimeStatus } from "~/hooks/use-real-time-status";
import {
  type ProjectWithStats,
  type ClipWithDetails,
} from "~/actions/projects";
import { ChunkCard } from "~/components/chunkwise/ChunkCard";
import { ChunkTable } from "~/components/chunkwise/ChunkTable";
import { CompletionCelebration } from "~/components/ui/completion-celebration";
import { ThumbnailImage } from "~/components/ui/thumbnail-image";
import { Button } from "~/components/ui/button";
import { ResetProgressModal } from "~/components/ui/reset-progress-modal";
import {
  RefreshCw,
  ArrowLeft,
  Play,
  Clock,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Trash2,
  Youtube,
  X,
  Info,
  ChevronRight,
  Layers,
  Grid3X3,
  List,
  RotateCcw,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SelectionProvider } from "~/contexts/selection-context";
import { DebugPanel } from "~/components/ui/debug-panel";

interface ChunkConfig {
  method: "minutes" | "chunks";
  minutesPerChunk: number;
  totalChunks: number;
}

function ProjectDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  // Use React Query hooks for optimized data fetching
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(projectId);
  // Use real-time status updates - keep connection alive until we've handled completion
  const { currentStatus, currentProgress, isConnected } = useRealTimeStatus(
    project ? projectId : null,
    project?.status,
  );

  // Always fetch clips - let the backend handle returning empty array for non-processed projects
  // This simplifies the cache behavior and avoids conditional query issues
  const {
    data: clips = [],
    isLoading: clipsLoading,
    error: clipsError,
    refetch: refetchClips,
    isFetching: clipsFetching,
    isRefetching: clipsRefetching,
  } = useProjectClips(projectId, { limit: 20 });

  const [showCelebration, setShowCelebration] = useState(false);
  const [isRechunkDialogOpen, setIsRechunkDialogOpen] = useState(false);
  const [isRechunking, setIsRechunking] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("list"); // Default to list view
  const [rechunkConfig, setRechunkConfig] = useState<ChunkConfig>({
    method: "minutes",
    minutesPerChunk: 5,
    totalChunks: 1,
  });
  const [lastConfigSlider, setLastConfigSlider] = useState<
    "minutesPerChunk" | "totalChunks"
  >("minutesPerChunk");

  const isLoading = projectLoading || clipsLoading;
  const error = projectError ?? clipsError;

  // Simple status logging - no complex cache invalidation needed
  useEffect(() => {
    if (currentStatus && project && currentStatus !== project.status) {
      console.log(
        `📡 Project ${projectId} status updated: ${project.status} → ${currentStatus}`,
      );
    }
  }, [currentStatus, project, projectId]);

  // Also invalidate cache when status changes to ensure fresh data
  useEffect(() => {
    if (currentStatus === "processed" && project?.status !== "processed") {
      console.log(`🔄 Processing complete, invalidating queries...`);

      // Invalidate both project and clips queries to ensure fresh data
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.project(projectId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.clips(projectId),
          exact: false,
        });
      }, 1000); // Give backend a moment to fully update
    }
  }, [currentStatus, project?.status, projectId, queryClient]);

  // Force refetch clips when they're empty but should exist
  useEffect(() => {
    const shouldHaveClips =
      (project?.status === "processed" || currentStatus === "processed") &&
      (project?.totalClips ?? 0) > 0 &&
      clips.length === 0 &&
      !clipsLoading &&
      !clipsFetching;

    if (shouldHaveClips) {
      console.log(`🔄 Clips missing but expected, forcing refetch...`, {
        projectStatus: project?.status,
        currentStatus,
        totalClips: project?.totalClips,
        clipsLength: clips.length,
      });

      // Force refetch after a small delay
      setTimeout(() => {
        refetchClips();
      }, 1500);
    }
  }, [
    project?.status,
    project?.totalClips,
    currentStatus,
    clips.length,
    clipsLoading,
    clipsFetching,
    refetchClips,
  ]);

  // Handle window focus and visibility changes to ensure clips load
  useEffect(() => {
    const handleFocus = () => {
      if (
        project?.status === "processed" &&
        clips.length === 0 &&
        !clipsLoading
      ) {
        console.log(`🔄 Window focused, checking for missing clips...`);
        refetchClips();
      }
    };

    const handleVisibilityChange = () => {
      if (
        !document.hidden &&
        project?.status === "processed" &&
        clips.length === 0 &&
        !clipsLoading
      ) {
        console.log(`🔄 Tab became visible, checking for missing clips...`);
        refetchClips();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [project?.status, clips.length, clipsLoading, refetchClips]);

  // Initialize rechunk config when project loads
  useEffect(() => {
    if (project && clips.length > 0) {
      // Try to estimate current chunking from existing clips
      const estimatedMinutesPerChunk = clips.length > 0 ? 5 : 5; // Default fallback
      setRechunkConfig({
        method: "minutes",
        minutesPerChunk: estimatedMinutesPerChunk,
        totalChunks: clips.length || 1,
      });
    }
  }, [project, clips]);

  // Debug logging for clips data
  useEffect(() => {
    console.log(`📊 Clips data state:`, {
      projectId,
      clipsLength: clips.length,
      clipsLoading,
      clipsFetching,
      clipsRefetching,
      projectStatus: project?.status,
      currentStatus,
      clips: clips.slice(0, 2), // Log first 2 clips for debugging
    });
  }, [
    clips,
    clipsLoading,
    clipsFetching,
    clipsRefetching,
    project?.status,
    currentStatus,
    projectId,
  ]);

  const handleCompletionChange = useCallback(
    (clipId: string, isCompleted: boolean) => {
      if (isCompleted) {
        const completedClips =
          clips.filter((clip) => clip.isCompleted).length + 1;
        const totalClips = clips.length;
        const progressPercentage = (completedClips / totalClips) * 100;

        if (progressPercentage === 100) {
          setShowCelebration(true);
        } else if (completedClips % 5 === 0) {
          setShowCelebration(true);
        }
      }
    },
    [clips],
  );

  const handleDeleteProject = async () => {
    if (!project) return;

    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeletingProject(true);
    try {
      console.log("Deleting project:", project.id);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = (await response.json()) as {
          success: boolean;
          message: string;
        };
        console.log("Delete response:", data);
        toast.success("Project deleted successfully!");

        // Invalidate React Query cache
        await queryClient.invalidateQueries({ queryKey: queryKeys.projects });

        router.push("/dashboard/library");
      } else {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        console.error("Delete project failed:", response.status, errorData);

        let errorMessage = "Failed to delete project. Please try again.";

        if (response.status === 401) {
          errorMessage = "You are not authorized to delete this project.";
        } else if (response.status === 404) {
          errorMessage = "Project not found. It may have already been deleted.";
        } else if (response.status === 409) {
          errorMessage =
            "Cannot delete project because it has related data. Please contact support.";
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }

        toast.error(errorMessage);
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error(
        "Network error while deleting project. Please check your connection and try again.",
      );
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleResetProgress = async () => {
    if (!project) return;

    // IMPORTANT: Reset should only affect user progress data, never trigger reprocessing
    // This function ONLY resets clip completion/watchTime data, NOT the project processing status
    // We use optimistic updates and careful cache invalidation to avoid triggering apparent "reprocessing"
    try {
      const response = await fetch(`/api/projects/${project.id}/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          errorData.message ?? "Failed to reset project progress",
        );
      }

      // Optimistically update clips data without touching project processing status
      queryClient.setQueryData(
        queryKeys.clips(projectId, { limit: 20 }),
        (oldData: ClipWithDetails[] | undefined) => {
          return (
            oldData?.map((clip) => ({
              ...clip,
              isCompleted: false,
              completedAt: null,
              watchTime: 0,
            })) ?? []
          );
        },
      );

      // Only invalidate clips data, not the entire project (to avoid apparent reprocessing)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clips(projectId),
        exact: false, // This will invalidate all clips queries for this project
      });

      toast.success("Project progress reset successfully! 🎉");
    } catch (error) {
      console.error("Error resetting project progress:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset project progress",
      );
    }
  };

  const handleRechunkConfigChange = (
    field: "minutesPerChunk" | "totalChunks",
    value: number,
  ) => {
    if (!project) return;
    setLastConfigSlider(field);
    // Estimate video duration from existing clips or use a default
    const estimatedDurationMinutes = clips.length > 0 ? clips.length * 5 : 60; // Rough estimate

    if (field === "minutesPerChunk") {
      const newTotalChunks = Math.ceil(estimatedDurationMinutes / value);
      setRechunkConfig({
        method: "minutes",
        minutesPerChunk: value,
        totalChunks: newTotalChunks,
      });
    } else if (field === "totalChunks") {
      const newMinutesPerChunk = estimatedDurationMinutes / value;
      setRechunkConfig({
        method: "chunks",
        minutesPerChunk: newMinutesPerChunk,
        totalChunks: value,
      });
    }
  };

  const handleRechunk = async () => {
    if (!project) return;

    setIsRechunking(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/rechunk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chunkConfig: rechunkConfig,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errorData.message ?? "Failed to re-chunk project");
      }

      // Close dialog and refresh data
      setIsRechunkDialogOpen(false);

      // Invalidate and refetch project data
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(projectId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.clips(projectId),
        exact: false,
      });

      // Optional: Show success message
      toast.success(
        "Project re-chunking started! Processing may take a few minutes.",
      );
    } catch (error) {
      console.error("Error re-chunking project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to re-chunk project",
      );
    } finally {
      setIsRechunking(false);
    }
  };

  const getSliderConstraints = () => {
    const estimatedDurationMinutes = clips.length > 0 ? clips.length * 5 : 60;
    const minChunkMinutes = 3;
    const maxChunkMinutes = Math.max(estimatedDurationMinutes, minChunkMinutes);
    const maxChunks = Math.floor(estimatedDurationMinutes / minChunkMinutes);
    const minChunks = 1;

    return {
      minMinutes: minChunkMinutes,
      maxMinutes: maxChunkMinutes,
      minChunks,
      maxChunks: Math.max(maxChunks, 1),
    };
  };

  const sliderConstraints = getSliderConstraints();

  const formatMinutes = (minutes: number): string => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes === Math.floor(minutes)) {
      return `${Math.floor(minutes)}m`;
    } else {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return `${mins}m ${secs}s`;
    }
  };

  const getProcessingStatusInfo = (
    status: string,
    progressPercentage: number,
  ) => {
    if (status === "processed" || progressPercentage === 100) {
      return {
        color: "green",
        label: "Ready",
        description: "Content is processed and ready to watch",
        badgeClass: "bg-green-100 text-green-800 border-green-200",
        progressClass: "bg-green-500",
        icon: CheckCircle2,
      };
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return {
        color: "blue",
        label: "Processing",
        description: "Your content is being processed into learning chunks",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        progressClass: "bg-blue-500",
        icon: Loader2,
        iconClass: "animate-spin",
      };
    } else if (status === "queued") {
      return {
        color: "yellow",
        label: "Queued",
        description: "Your project is queued for processing",
        badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
        progressClass: "bg-yellow-500",
        icon: Clock,
      };
    } else if (status === "no credits" || status === "failed") {
      return {
        color: "red",
        label: "Failed",
        description: "Processing failed. Please try again or contact support.",
        badgeClass: "bg-red-100 text-red-800 border-red-200",
        progressClass: "bg-red-500",
        icon: AlertCircle,
      };
    } else {
      return {
        color: "gray",
        label: "Pending",
        description: "Project is being prepared for processing",
        badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
        progressClass: "bg-gray-500",
        icon: Info,
      };
    }
  };

  // Calculate user completion status
  const getUserCompletionInfo = () => {
    if (!clips.length) {
      return {
        completedCount: 0,
        totalCount: 0,
        progressPercentage: 0,
        status: "not-started" as const,
      };
    }

    const completedCount = clips.filter((clip) => clip.isCompleted).length;
    const totalCount = clips.length;
    const userProgressPercentage =
      totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    let status: "not-started" | "in-progress" | "completed";
    if (completedCount === 0) {
      status = "not-started";
    } else if (completedCount === totalCount) {
      status = "completed";
    } else {
      status = "in-progress";
    }

    return {
      completedCount,
      totalCount,
      progressPercentage: userProgressPercentage,
      status,
    };
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Error Loading Project
          </h1>
          <p className="mt-2 text-gray-600">
            {error instanceof Error ? error.message : "Failed to load project"}
          </p>
          <Link
            href="/dashboard/library"
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            Project Not Found
          </h1>
          <p className="mt-2 text-gray-600">
            The project you&rsquo;re looking for doesn&rsquo;t exist or has been
            deleted.
          </p>
          <Link
            href="/dashboard/library"
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  // Use real-time status if available, otherwise use project status
  const effectiveStatus = currentStatus || project.status;

  // Use processing progress when available (during processing), otherwise use user progress
  const effectiveProgress =
    currentProgress !== null ? currentProgress : project.progressPercentage;

  const processingStatus = getProcessingStatusInfo(
    effectiveStatus,
    effectiveProgress,
  );
  const userCompletion = getUserCompletionInfo();
  const StatusIcon = processingStatus.icon;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4 sm:space-y-6"
      >
        {/* Header with Breadcrumbs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            {/* Breadcrumbs */}
            <nav className="mb-2 flex items-center space-x-2 text-sm text-gray-500">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-gray-700"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link
                href="/dashboard/library"
                className="transition-colors hover:text-gray-700"
              >
                Library
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900">Project Details</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {project.displayName ?? `Project ${project.id.slice(0, 8)}`}
            </h1>
          </div>

          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            {project.youtubeUrl && (
              <a
                href={project.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Youtube className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">View Original</span>
                <span className="sm:hidden">Original</span>
              </a>
            )}

            {(project.progressPercentage === 100 ||
              project.status === "processed") &&
              project.status !== "failed" &&
              project.status !== "no credits" && (
                <>
                  <button
                    onClick={() => setIsRechunkDialogOpen(true)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Re-chunk</span>
                    <span className="sm:hidden">Re-chunk</span>
                  </button>

                  {/* Reset Progress Button - Only show if there's progress to reset */}
                  {userCompletion.completedCount > 0 && (
                    <button
                      onClick={() => setIsResetModalOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Reset Progress</span>
                      <span className="sm:hidden">Reset</span>
                    </button>
                  )}
                </>
              )}

            <button
              onClick={handleDeleteProject}
              disabled={isDeletingProject}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isDeletingProject ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>

        {/* Project Overview Card - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex flex-col p-4 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
            {/* Thumbnail - Responsive */}
            <div className="mb-4 sm:mb-0 sm:flex-shrink-0">
              <ThumbnailImage
                thumbnailUrl={project.thumbnailUrl}
                alt={project.displayName ?? "Project thumbnail"}
                className="h-40 w-full rounded-lg object-cover shadow-sm sm:h-32 sm:w-48"
                fallback={
                  <div className="flex h-40 w-full items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 sm:h-32 sm:w-48">
                    <div className="text-center">
                      <Play className="mx-auto h-8 w-8 text-gray-400" />
                      <span className="mt-1 block text-xs text-gray-500">
                        No thumbnail
                      </span>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Project Info - Responsive */}
            <div className="flex-1 space-y-4">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center">
                  <Layers className="mr-1.5 h-4 w-4" />
                  {project.chunksCount ?? 0} chunks
                </span>
                <span className="flex items-center">
                  <Clock className="mr-1.5 h-4 w-4" />
                  {project.totalDuration}
                </span>
                <span className="flex items-center">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Only show processing status while actually processing */}
              {effectiveProgress < 100 && effectiveStatus !== "processed" ? (
                <>
                  {/* Processing Status Badge with Real-time Indicator */}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium",
                        processingStatus.badgeClass,
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "mr-2 h-4 w-4",
                          processingStatus.iconClass,
                        )}
                      />
                      {processingStatus.label}
                    </div>

                    {/* Real-time connection indicator */}
                    {isConnected && (
                      <div className="flex items-center text-xs text-green-600">
                        <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        Live
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 sm:text-base">
                    {processingStatus.description}
                  </p>

                  {/* Processing Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Processing</span>
                      <span className="font-medium text-gray-900">
                        {Math.round(effectiveProgress)}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${effectiveProgress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={cn(
                          "h-2 rounded-full",
                          processingStatus.progressClass,
                        )}
                      />
                      {/* Animated processing indicator */}
                      {effectiveStatus === "processing" && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Backend processing status</span>
                      <span>
                        Updated{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Content is ready - show only user progress */
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Your Progress</span>
                    <span className="font-medium text-gray-900">
                      {Math.round(userCompletion.progressPercentage)}%
                    </span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${userCompletion.progressPercentage}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {userCompletion.completedCount} of{" "}
                      {userCompletion.totalCount} chunks watched
                    </span>
                    <span>
                      {userCompletion.status === "completed"
                        ? "🎉 All watched!"
                        : userCompletion.status === "in-progress"
                          ? "📚 Keep learning"
                          : "▶️ Ready to start"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Content Based on Status */}
        {(effectiveProgress === 100 || effectiveStatus === "processed") &&
        effectiveStatus !== "failed" &&
        effectiveStatus !== "no credits" ? (
          // Completed Project - Show Clips
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
                Learning Chunks
              </h3>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {project.chunksCount ?? 0} total chunks
                </span>

                {/* Layout Toggle */}
                <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
                  <button
                    onClick={() => setLayout("grid")}
                    className={cn(
                      "flex h-9 items-center px-2.5 text-sm font-medium transition-colors sm:h-10 sm:px-3",
                      layout === "grid"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900",
                    )}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <div className="h-5 w-px bg-gray-300 sm:h-6" />
                  <button
                    onClick={() => setLayout("list")}
                    className={cn(
                      "flex h-9 items-center px-2.5 text-sm font-medium transition-colors sm:h-10 sm:px-3",
                      layout === "list"
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900",
                    )}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {(project.chunksCount ?? 0) > 0 ? (
              layout === "grid" ? (
                // Grid View
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  {clips.length > 0 && !clipsLoading && !clipsFetching
                    ? clips.map((clip, index) => (
                        <motion.div
                          key={clip.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <ChunkCard
                            clip={clip}
                            index={index}
                            projectId={projectId}
                            onCompletionChange={handleCompletionChange}
                          />
                        </motion.div>
                      ))
                    : // Show placeholder chunks when clips are loading or haven't been created yet
                      Array.from({ length: project.chunksCount ?? 0 }).map(
                        (_, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="rounded-lg border border-gray-200 bg-white p-4 opacity-75"
                          >
                            <div className="mb-3 flex aspect-video items-center justify-center rounded bg-gray-100">
                              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                            <h4 className="mb-1 font-medium text-gray-500">
                              Chunk {index + 1}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {clipsLoading || clipsFetching
                                ? "Loading clip..."
                                : "Processing clip..."}
                            </p>
                          </motion.div>
                        ),
                      )}
                </div>
              ) : (
                // Table View
                <ChunkTable
                  clips={clips}
                  projectId={projectId}
                  onCompletionChange={handleCompletionChange}
                  isLoading={
                    clipsLoading ||
                    clipsFetching ||
                    (clips.length === 0 && (project.chunksCount ?? 0) > 0)
                  }
                  placeholderCount={project.chunksCount ?? 0}
                />
              )
            ) : (
              <div className="py-12 text-center">
                <Layers className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No chunks available
                </h3>
                <p className="text-gray-500">
                  The processing seems to have completed without generating
                  chunks.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          // Processing/Pending/Failed Project - Show Status
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            <div
              className={cn(
                "rounded-lg border p-4 sm:p-6",
                effectiveStatus === "failed" || effectiveStatus === "no credits"
                  ? "border-red-200 bg-red-50"
                  : "border-blue-200 bg-blue-50",
              )}
            >
              <div className="flex items-start">
                <StatusIcon
                  className={cn(
                    "h-6 w-6 flex-shrink-0",
                    effectiveStatus === "failed" ||
                      effectiveStatus === "no credits"
                      ? "text-red-600"
                      : "text-blue-600",
                    processingStatus.iconClass,
                  )}
                />
                <div className="ml-3 flex-1">
                  <h3
                    className={cn(
                      "text-lg font-medium",
                      effectiveStatus === "failed" ||
                        effectiveStatus === "no credits"
                        ? "text-red-900"
                        : "text-blue-900",
                    )}
                  >
                    {processingStatus.label === "Processing"
                      ? "Processing Your Content"
                      : processingStatus.label}
                  </h3>
                  <p
                    className={cn(
                      "mt-1 text-sm sm:text-base",
                      effectiveStatus === "failed" ||
                        effectiveStatus === "no credits"
                        ? "text-red-800"
                        : "text-blue-800",
                    )}
                  >
                    {processingStatus.description}
                  </p>

                  {effectiveStatus === "processing" && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm text-blue-700">
                        What&rsquo;s happening now:
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-blue-700">
                        <li>Analyzing audio and video content</li>
                        <li>Splitting into optimized learning segments</li>
                        <li>Generating transcripts and summaries</li>
                        <li>Creating searchable content index</li>
                      </ul>
                    </div>
                  )}

                  {(effectiveStatus === "failed" ||
                    effectiveStatus === "no credits") && (
                    <div className="mt-4">
                      <p className="mb-3 text-sm text-red-700">
                        <strong>What can you do:</strong>
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                        <li>Try uploading the content again</li>
                        <li>Check if the video/audio file is corrupted</li>
                        <li>Ensure the content meets our supported formats</li>
                        <li>Contact support if the issue persists</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showCelebration && (
          <CompletionCelebration
            show={showCelebration}
            onComplete={() => setShowCelebration(false)}
          />
        )}

        {/* Reset Progress Modal */}
        <ResetProgressModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onConfirm={handleResetProgress}
          title="Reset Project Progress"
          description="This will reset your viewing progress for all chunks in this project. You'll be able to start fresh and track your progress again."
          itemCount={userCompletion.completedCount}
          itemType="project"
          itemName={project.displayName ?? `Project ${project.id.slice(0, 8)}`}
        />

        {/* Re-chunk Modal - Mobile Optimized */}
        <AnimatePresence>
          {isRechunkDialogOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setIsRechunkDialogOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">
                    Re-chunk Project
                  </h2>
                  <button
                    onClick={() => setIsRechunkDialogOpen(false)}
                    className="rounded-lg p-1 transition-colors hover:bg-gray-100"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Minutes per chunk:{" "}
                      {formatMinutes(rechunkConfig.minutesPerChunk)}
                    </label>
                    <input
                      type="range"
                      min={sliderConstraints.minMinutes}
                      max={sliderConstraints.maxMinutes}
                      step={0.5}
                      value={rechunkConfig.minutesPerChunk}
                      onChange={(e) =>
                        handleRechunkConfigChange(
                          "minutesPerChunk",
                          parseFloat(e.target.value),
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Total chunks: {rechunkConfig.totalChunks}
                    </label>
                    <input
                      type="range"
                      min={sliderConstraints.minChunks}
                      max={sliderConstraints.maxChunks}
                      step={1}
                      value={rechunkConfig.totalChunks}
                      onChange={(e) =>
                        handleRechunkConfigChange(
                          "totalChunks",
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="rounded-lg bg-yellow-50 p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Re-chunking will replace existing
                      chunks and reset completion progress.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsRechunkDialogOpen(false)}
                    disabled={isRechunking}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRechunk}
                    disabled={isRechunking}
                    className="flex-1"
                  >
                    {isRechunking ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Re-chunking...
                      </>
                    ) : (
                      "Re-chunk Project"
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Debug Panel for development */}
      {process.env.NODE_ENV === "development" && (
        <DebugPanel projectId={projectId} />
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <SelectionProvider>
      <ProjectDetailPageContent />
    </SelectionProvider>
  );
}