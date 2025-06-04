"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProject, useProjectClips } from "~/hooks/use-projects";
import { useQueryClient } from "@tanstack/react-query";
import {
  deleteProject,
  type ProjectWithStats,
  type ClipWithDetails,
} from "~/actions/projects";
import { ChunkCard } from "~/components/chunkwise/ChunkCard";
import { CompletionCelebration } from "~/components/ui/completion-celebration";
import { ThumbnailImage } from "~/components/ui/thumbnail-image";

export default function ProjectDetailPage() {
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
  const {
    data: clips = [],
    isLoading: clipsLoading,
    error: clipsError,
  } = useProjectClips(projectId, { limit: 20 });

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");

  const isLoading = projectLoading || clipsLoading;
  const error = projectError || clipsError;

  const handleCompletionChange = useCallback(
    (clipId: string, isCompleted: boolean) => {
      if (isCompleted) {
        const completedClips =
          clips.filter((clip) => clip.isCompleted).length + 1;
        const totalClips = clips.length;
        const progressPercentage = (completedClips / totalClips) * 100;

        if (progressPercentage === 100) {
          setCelebrationMessage(
            "🎉 Congratulations! You've completed all chunks!",
          );
          setShowCelebration(true);
        } else if (completedClips % 5 === 0) {
          setCelebrationMessage(
            `🚀 Great progress! ${completedClips} chunks completed!`,
          );
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

    try {
      const success = await deleteProject(project.id);
      if (success) {
        router.push("/dashboard/projects");
      } else {
        alert("Failed to delete project. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project. Please try again.");
    }
  };

  const getStatusInfo = (status: string, progressPercentage: number) => {
    if (status === "processed" || progressPercentage === 100) {
      return {
        color: "green",
        label: "Completed",
        description: "Project processing is complete and clips are ready",
        badgeClass: "bg-green-100 text-green-800",
        progressClass: "bg-green-500",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return {
        color: "blue",
        label: "Processing",
        description: "Your content is being processed into learning chunks",
        badgeClass: "bg-blue-100 text-blue-800",
        progressClass: "bg-blue-500",
        icon: (
          <svg
            className="h-5 w-5 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        ),
      };
    } else if (status === "queued") {
      return {
        color: "yellow",
        label: "Queued",
        description: "Your project is queued for processing",
        badgeClass: "bg-yellow-100 text-yellow-800",
        progressClass: "bg-yellow-500",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      };
    } else if (status === "no credits" || status === "failed") {
      return {
        color: "red",
        label: "Failed",
        description: "Processing failed. Please try again or contact support.",
        badgeClass: "bg-red-100 text-red-800",
        progressClass: "bg-red-500",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        ),
      };
    } else {
      return {
        color: "gray",
        label: "Pending",
        description: "Project is being prepared for processing",
        badgeClass: "bg-gray-100 text-gray-800",
        progressClass: "bg-gray-500",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        ),
      };
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
          <p className="mt-2 text-gray-600">
            {error instanceof Error ? error.message : "Failed to load project"}
          </p>
          <Link
            href="/dashboard/projects"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Project Not Found
          </h1>
          <p className="mt-2 text-gray-600">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            href="/dashboard/projects"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(project.status, project.progressPercentage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/dashboard/projects"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Project Details
            </h1>
          </div>
          <p className="mt-1 text-gray-500">
            View and manage your learning project
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {project.youtubeUrl && (
            <a
              href={project.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              View Original
            </a>
          )}
          <button
            onClick={handleDeleteProject}
            className="inline-flex items-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Project
          </button>
        </div>
      </div>

      {/* Project Overview Card */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-6">
          <div className="flex items-start space-x-6">
            {/* Thumbnail */}
            <div className="flex-shrink-0">
              <ThumbnailImage
                thumbnailUrl={project.thumbnailUrl}
                alt={project.displayName || "Project thumbnail"}
                className="h-32 w-48 rounded-lg object-cover shadow-sm"
                fallback={
                  <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="mt-1 block text-xs text-gray-500">
                        No thumbnail
                      </span>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Project Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {project.displayName}
                </h2>
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <span>{project.chunksCount ?? 0} chunks</span>
                  <span>•</span>
                  <span>{project.totalDuration}</span>
                  <span>•</span>
                  <span>Created {project.createdAt.toLocaleDateString()}</span>
                </div>
              </div>

              {/* Status */}
              <div
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.badgeClass}`}
              >
                {statusInfo.icon}
                <span className="ml-2">{statusInfo.label}</span>
              </div>

              <p className="text-sm text-gray-600">{statusInfo.description}</p>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">
                    {Math.round(project.progressPercentage)}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-3 rounded-full transition-all ${statusInfo.progressClass}`}
                    style={{ width: `${project.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {project.completedChunks} of {project.chunksCount ?? 0}{" "}
                    chunks completed
                  </span>
                  <span>
                    Last updated {project.updatedAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Based on Status */}
      {project.progressPercentage === 100 || project.status === "processed" ? (
        // Completed Project - Show Clips
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Learning Chunks
            </h3>
            <span className="text-sm text-gray-500">
              {project.chunksCount ?? 0} total chunks
            </span>
          </div>

          {(project.chunksCount ?? 0) > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clips.length > 0
                ? clips.map((clip, index) => (
                    <ChunkCard
                      key={clip.id}
                      clip={clip}
                      index={index}
                      projectId={projectId}
                      onCompletionChange={handleCompletionChange}
                    />
                  ))
                : // Show placeholder chunks when clips haven't been created yet but chunksCount > 0
                  [...Array(project.chunksCount ?? 0)].map((_, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 bg-white p-4 opacity-75 transition-shadow hover:shadow-md"
                    >
                      <div className="mb-3 flex aspect-video items-center justify-center rounded bg-gray-100">
                        <svg
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h4 className="mb-1 font-medium text-gray-500">
                        Chunk {index + 1}
                      </h4>
                      <p className="mb-1 text-sm text-gray-400">
                        Processing...
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Processing clip...
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No chunks available
              </h3>
              <p className="text-gray-500">
                The processing seems to have completed without generating
                chunks.
              </p>
            </div>
          )}
        </div>
      ) : (
        // Processing/Pending Project - Show Status and Tips
        <div className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="text-blue-600">{statusInfo.icon}</div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-blue-900">
                  {statusInfo.label === "Processing"
                    ? "Processing Your Content"
                    : statusInfo.label}
                </h3>
                <p className="mt-1 text-blue-800">{statusInfo.description}</p>

                {project.status === "processing" && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm text-blue-700">
                      What's happening now:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-blue-700">
                      <li>Analyzing audio and video content</li>
                      <li>Splitting into optimized learning segments</li>
                      <li>Generating transcripts and summaries</li>
                      <li>Creating searchable content index</li>
                    </ul>
                  </div>
                )}

                {project.status === "queued" && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm text-blue-700">
                      Your project is in the queue. Processing will begin
                      shortly.
                    </p>
                    <p className="text-sm text-blue-700">
                      Average processing time: 5-10 minutes for a 1-hour video.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              While You Wait
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Explore Other Projects
                  </h4>
                  <p className="text-sm text-gray-600">
                    Check out your completed projects or start a new one
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Learn About Features
                  </h4>
                  <p className="text-sm text-gray-600">
                    Discover how to get the most from your chunked content
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Link
                href="/dashboard/projects"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                View All Projects
              </Link>
              <Link
                href="/dashboard/new-project"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Create New Project
              </Link>
            </div>
          </div>
        </div>
      )}

      {showCelebration && (
        <CompletionCelebration
          show={showCelebration}
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
