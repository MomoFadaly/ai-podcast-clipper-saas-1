"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { deleteProject, type ProjectWithStats } from "~/actions/projects";
import { ThumbnailImage } from "~/components/ui/thumbnail-image";
import { useProjects } from "~/hooks/use-projects";
import { useMultiProjectStatus } from "~/hooks/use-multi-project-status";

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const [sortBy, setSortBy] = useState("recent");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deletingProject, setDeletingProject] = useState<string | null>(null);

  // Real-time status updates for all projects
  const { getProjectStatus, hasActiveConnection, activeConnections } =
    useMultiProjectStatus(projects);

  // If still loading authentication, show loading
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, this should be handled by the layout, but just in case
  if (status === "unauthenticated") {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h1 className="text-2xl font-bold text-blue-800">
            Authentication Required
          </h1>
          <p className="mt-1 text-blue-600">
            Please log in to view your projects.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleDeleteProject = async (projectId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setDeletingProject(projectId);
      const success = await deleteProject(projectId);
      if (success) {
        // Refetch projects after successful deletion
        void refetch();
      } else {
        alert("Failed to delete project. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project. Please try again.");
    } finally {
      setDeletingProject(null);
    }
  };

  const filteredProjects = projects
    .filter((project) => {
      if (filterStatus === "all") return true;

      // Map internal statuses to filter options
      if (filterStatus === "completed") {
        return (
          project.status === "processed" || project.progressPercentage === 100
        );
      } else if (filterStatus === "in-progress") {
        return (
          (project.status === "processing" || project.status === "processed") &&
          project.progressPercentage > 0 &&
          project.progressPercentage < 100
        );
      } else if (filterStatus === "processing") {
        return project.status === "queued" || project.status === "processing";
      }

      return project.status === filterStatus;
    })
    .sort((a, b) => {
      if (sortBy === "recent") {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      if (sortBy === "progress") {
        return b.progressPercentage - a.progressPercentage;
      }
      return (a.displayName ?? "").localeCompare(b.displayName ?? "");
    });

  const getProcessingStatusBadge = (
    status: string,
    progressPercentage: number,
  ) => {
    if (status === "processed" || progressPercentage === 100) {
      return { class: "bg-green-100 text-green-800", label: "Ready" };
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return { class: "bg-blue-100 text-blue-800", label: "Processing" };
    } else if (status === "queued") {
      return { class: "bg-yellow-100 text-yellow-800", label: "Queued" };
    } else if (status === "no credits") {
      return { class: "bg-red-100 text-red-800", label: "Failed" };
    } else {
      return { class: "bg-gray-100 text-gray-800", label: "Pending" };
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-2xl font-bold text-red-800">
            Error Loading Projects
          </h1>
          <p className="mt-1 text-red-600">
            {error instanceof Error ? error.message : "Failed to load projects"}
          </p>
          <div className="mt-4 space-x-4">
            <button
              onClick={() => void refetch()}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Retry
            </button>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-gray-500">
              Manage your YouTube learning projects
            </p>

            {/* Real-time connection indicator (development only) */}
            {process.env.NODE_ENV === "development" &&
              activeConnections > 0 && (
                <div className="flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  {activeConnections} live connection
                  {activeConnections !== 1 ? "s" : ""}
                </div>
              )}
          </div>
        </div>
        <Link
          href="/dashboard/new-project"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          New Project
        </Link>
      </div>

      {/* Filters and Sort */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by status:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="recent">Most Recent</option>
              <option value="progress">Progress</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div className="aspect-video bg-gray-200"></div>
              <div className="p-4">
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                <div className="mb-3 flex items-center space-x-2">
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                  <div className="h-3 w-20 rounded bg-gray-200"></div>
                </div>
                <div className="mb-4">
                  <div className="mb-1 h-3 w-full rounded bg-gray-200"></div>
                  <div className="h-2 w-full rounded bg-gray-200"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-4 w-8 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
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
            {projects.length === 0 ? "No projects yet" : "No projects found"}
          </h3>
          <p className="mb-4 text-gray-500">
            {projects.length === 0
              ? "Get started by creating your first YouTube learning project"
              : "Try adjusting your filters to see more projects"}
          </p>
          {projects.length === 0 && (
            <Link
              href="/dashboard/new-project"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            // Use real-time status if available, otherwise use project status
            const effectiveStatus = getProjectStatus(
              project.id,
              project.status,
            );
            const statusInfo = getProcessingStatusBadge(
              effectiveStatus,
              project.progressPercentage,
            );

            return (
              <div
                key={project.id}
                className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-lg"
              >
                {/* Main clickable link covering the entire card */}
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="absolute inset-0 z-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                  aria-label={`View project: ${project.displayName}`}
                />

                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  <ThumbnailImage
                    thumbnailUrl={project.thumbnailUrl}
                    alt={project.displayName ?? "Project thumbnail"}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
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
                          <span className="mt-2 block text-sm text-gray-500">
                            Generating thumbnail...
                          </span>
                        </div>
                      </div>
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-sm font-medium text-white">
                    {project.totalDuration}
                  </div>
                  {/* Only show processing status while processing */}
                  {effectiveStatus !== "processed" &&
                    project.progressPercentage < 100 && (
                      <div className="absolute right-3 bottom-3 flex items-center gap-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.class}`}
                        >
                          {effectiveStatus === "processing" && (
                            <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                          )}
                          {statusInfo.label}
                        </span>

                        {/* Real-time connection indicator */}
                        {hasActiveConnection(project.id) && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="mb-2 line-clamp-2 font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                    {project.displayName}
                  </h3>

                  <div className="mb-3 flex items-center text-sm text-gray-500">
                    <span>{project.chunksCount} chunks</span>
                    <span className="mx-2">•</span>
                    <span>{project.createdAt.toLocaleDateString()}</span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {project.completedChunks ?? 0} of {project.chunksCount}{" "}
                        watched
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(
                          ((project.completedChunks ?? 0) /
                            (project.chunksCount ?? 1)) *
                            100,
                        )}
                        % watched
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-purple-600 transition-all duration-200 group-hover:bg-purple-700"
                        style={{
                          width: `${Math.round(((project.completedChunks ?? 0) / (project.chunksCount ?? 1)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600 transition-colors group-hover:text-blue-800">
                      View Details →
                    </span>

                    <div className="relative z-20 flex items-center space-x-2">
                      {project.youtubeUrl && (
                        <a
                          href={project.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 transition-colors hover:text-red-600"
                          title="View on YouTube"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteProject(project.id);
                        }}
                        disabled={deletingProject === project.id}
                        className="p-1 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50"
                        title="Delete project"
                      >
                        {deletingProject === project.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600"></div>
                        ) : (
                          <svg
                            className="h-4 w-4"
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
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
