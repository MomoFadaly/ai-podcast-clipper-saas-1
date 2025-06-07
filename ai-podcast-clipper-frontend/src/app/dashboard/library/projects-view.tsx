"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteProject } from "~/actions/projects";
import { ThumbnailImage } from "~/components/ui/thumbnail-image";
import { useProjects } from "~/hooks/use-projects";
import { useRenameProject } from "~/hooks/use-tracks";
import AddProjectToTrackModal from "~/components/tracks/add-project-to-track-modal";
import ProjectTracksDisplay from "~/components/tracks/project-tracks-display";
import {
  Calendar,
  Clock,
  Play,
  Trash2,
  Youtube,
  FolderOpen,
  Plus,
  Route,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { motion } from "framer-motion";
import { InlineEdit } from "~/components/ui/inline-edit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Checkbox } from "~/components/ui/checkbox";
import { SelectAllCheckbox } from "~/components/ui/select-all-checkbox";
import { useSelection } from "~/contexts/selection-context";

interface ProjectsViewProps {
  layoutType: "grid" | "list";
  searchQuery: string;
  isSelectionMode?: boolean;
}

export default function ProjectsView({
  layoutType,
  searchQuery,
  isSelectionMode = false,
}: ProjectsViewProps) {
  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const [deletingProject, setDeletingProject] = useState<string | null>(null);
  const [sortBy] = useState("recent");
  const [filterStatus] = useState("all");
  const [trackModalProject, setTrackModalProject] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const renameProjectMutation = useRenameProject();
  const { toggleItemSelection, isItemSelected } = useSelection();

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

  const handleProjectRename = async (projectId: string, newName: string) => {
    try {
      await renameProjectMutation.mutateAsync({
        projectId,
        displayName: newName.trim(),
      });
      // Refetch to update the display
      void refetch();
    } catch (error) {
      console.error("Failed to rename project:", error);
      throw error; // Re-throw so InlineEdit can handle the error
    }
  };

  const filteredProjects = projects
    .filter((project) => {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return project.displayName?.toLowerCase().includes(query) ?? false;
      }
      return true;
    })
    .filter((project) => {
      if (filterStatus === "all") return true;
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

  if (isLoading) {
    return (
      <div className="min-h-[400px]">
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
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="text-lg font-medium text-red-800">
            Error Loading Projects
          </h3>
          <p className="mt-1 text-red-600">
            {error instanceof Error ? error.message : "Failed to load projects"}
          </p>
          <button
            onClick={() => void refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (filteredProjects.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 p-6">
            <FolderOpen className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {searchQuery ? "No projects found" : "No projects yet"}
          </h3>
          <p className="mt-2 text-gray-500">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Get started by creating your first YouTube learning project"}
          </p>
          {!searchQuery && (
            <Link
              href="/dashboard/new-project"
              className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Grid Layout
  if (layoutType === "grid") {
    return (
      <div>
        {/* Select All Checkbox */}
        {isSelectionMode && (
          <SelectAllCheckbox
            availableItems={filteredProjects.map((project) => project.id)}
            label="Select all projects"
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filteredProjects.map((project, index) => {
            const statusInfo = getProcessingStatusBadge(
              project.status,
              project.progressPercentage,
            );
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.03,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-lg"
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div
                    className="absolute top-2 left-2 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isItemSelected(project.id)}
                      onCheckedChange={() => toggleItemSelection(project.id)}
                      className="h-5 w-5 bg-white/90 backdrop-blur-sm"
                    />
                  </div>
                )}

                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className={cn(
                    "absolute inset-0 z-10",
                    isSelectionMode && "pointer-events-none",
                  )}
                  aria-label={`View project: ${project.displayName}`}
                />

                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100">
                  <ThumbnailImage
                    thumbnailUrl={project.thumbnailUrl}
                    alt={project.displayName ?? "Project thumbnail"}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-2 left-2 text-xs font-medium text-white sm:bottom-3 sm:left-3 sm:text-sm">
                    {project.totalDuration}
                  </div>
                  {/* Only show processing status while processing */}
                  {project.status !== "processed" &&
                    project.progressPercentage < 100 && (
                      <div className="absolute right-2 bottom-2 sm:right-3 sm:bottom-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium sm:px-2.5",
                            statusInfo.class,
                          )}
                        >
                          {project.status === "processing" && (
                            <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                          )}
                          {statusInfo.label}
                        </span>
                      </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4">
                  <div className="mb-2">
                    <InlineEdit
                      value={
                        project.displayName ??
                        `Project ${project.id.slice(0, 8)}`
                      }
                      onSave={(newName) =>
                        handleProjectRename(project.id, newName)
                      }
                      placeholder="Project name"
                      className="line-clamp-2 text-sm font-medium text-gray-900 sm:text-base"
                      variant="default"
                    />
                  </div>
                  <div className="mb-3 flex items-center text-xs text-gray-500 sm:text-sm">
                    <span>{project.chunksCount} chunks</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-3 sm:mb-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {project.completedChunks || 0} of {project.chunksCount}{" "}
                        watched
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(
                          ((project.completedChunks || 0) /
                            (project.chunksCount || 1)) *
                            100,
                        )}
                        % watched
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200 sm:h-2">
                      <div
                        className="h-1.5 rounded-full bg-purple-600 transition-all duration-200 sm:h-2"
                        style={{
                          width: `${Math.round(((project.completedChunks || 0) / (project.chunksCount || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tracks */}
                  <div
                    className="relative z-20 mb-3 sm:mb-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ProjectTracksDisplay
                      projectId={project.id}
                      maxDisplay={2}
                      showAddButton={true}
                      onAddClick={() =>
                        setTrackModalProject({
                          id: project.id,
                          name: project.displayName ?? "Project",
                        })
                      }
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-600 sm:text-sm">
                      View Details →
                    </span>
                    <div className="relative z-20 flex items-center space-x-1 sm:space-x-2">
                      {project.youtubeUrl && (
                        <a
                          href={project.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 transition-colors hover:text-red-600"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="View on YouTube"
                        >
                          <Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </a>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1 text-gray-400 transition-colors hover:text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="More options"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setTrackModalProject({
                                id: project.id,
                                name: project.displayName ?? "Project",
                              })
                            }
                          >
                            <Route className="mr-2 h-4 w-4" />
                            Add to Track
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-red-600 focus:text-red-600"
                            disabled={deletingProject === project.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingProject === project.id
                              ? "Deleting..."
                              : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // List Layout - Mobile optimized
  return (
    <div>
      {/* Select All Checkbox */}
      {isSelectionMode && (
        <SelectAllCheckbox
          availableItems={filteredProjects.map((project) => project.id)}
          label="Select all projects"
        />
      )}

      <div className="space-y-3 sm:space-y-4">
        {filteredProjects.map((project, index) => {
          const statusInfo = getProcessingStatusBadge(
            project.status,
            project.progressPercentage,
          );
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.03,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="group relative rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-gray-300 hover:shadow-md sm:p-4"
            >
              {/* Selection Checkbox */}
              {isSelectionMode && (
                <div
                  className="absolute top-3 left-3 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isItemSelected(project.id)}
                    onCheckedChange={() => toggleItemSelection(project.id)}
                    className="h-5 w-5"
                  />
                </div>
              )}

              <Link
                href={`/dashboard/projects/${project.id}`}
                className={cn(
                  "absolute inset-0 z-10",
                  isSelectionMode && "pointer-events-none",
                )}
                aria-label={`View project: ${project.displayName}`}
              />

              <div
                className={cn(
                  "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
                  isSelectionMode && "ml-8",
                )}
              >
                {/* Thumbnail - Mobile optimized */}
                <div className="relative h-24 w-full overflow-hidden rounded-lg bg-gray-100 sm:h-20 sm:w-32 sm:flex-shrink-0">
                  <ThumbnailImage
                    thumbnailUrl={project.thumbnailUrl}
                    alt={project.displayName ?? "Project thumbnail"}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Content - Mobile optimized */}
                <div className="flex-1">
                  <div className="mb-2 flex flex-col gap-2 sm:mb-0 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <InlineEdit
                        value={
                          project.displayName ??
                          `Project ${project.id.slice(0, 8)}`
                        }
                        onSave={(newName) =>
                          handleProjectRename(project.id, newName)
                        }
                        placeholder="Project name"
                        className="text-sm font-medium text-gray-900 group-hover:text-blue-600 sm:text-base"
                        variant="default"
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 sm:text-sm">
                        <span className="flex items-center">
                          <Play className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {project.chunksCount} chunks
                        </span>
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {project.totalDuration}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge - Only show while processing */}
                    {project.status !== "processed" &&
                      project.progressPercentage < 100 && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium sm:px-3 sm:py-1",
                            statusInfo.class,
                          )}
                        >
                          {project.status === "processing" && (
                            <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                          )}
                          {statusInfo.label}
                        </span>
                      )}
                  </div>

                  {/* Progress Bar - Mobile optimized */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {project.completedChunks || 0} of {project.chunksCount}{" "}
                        watched
                      </span>
                      <span>
                        {Math.round(
                          ((project.completedChunks || 0) /
                            (project.chunksCount || 1)) *
                            100,
                        )}
                        % watched
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 sm:h-2">
                      <div
                        className="h-1.5 rounded-full bg-purple-600 transition-all duration-200 sm:h-2"
                        style={{
                          width: `${Math.round(((project.completedChunks || 0) / (project.chunksCount || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tracks - Mobile optimized */}
                  <div
                    className="relative z-20 mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ProjectTracksDisplay
                      projectId={project.id}
                      maxDisplay={3}
                      showAddButton={true}
                      onAddClick={() =>
                        setTrackModalProject({
                          id: project.id,
                          name: project.displayName ?? "Project",
                        })
                      }
                    />
                  </div>
                </div>

                {/* Actions - Mobile optimized */}
                <div className="relative z-20 flex items-center gap-2 sm:flex-col sm:gap-1">
                  {project.youtubeUrl && (
                    <a
                      href={project.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="View on YouTube"
                    >
                      <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
                    </a>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          setTrackModalProject({
                            id: project.id,
                            name: project.displayName ?? "Project",
                          })
                        }
                      >
                        <Route className="mr-2 h-4 w-4" />
                        Add to Track
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-600 focus:text-red-600"
                        disabled={deletingProject === project.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingProject === project.id
                          ? "Deleting..."
                          : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Project to Track Modal */}
      {trackModalProject && (
        <AddProjectToTrackModal
          isOpen={!!trackModalProject}
          onClose={() => setTrackModalProject(null)}
          projectId={trackModalProject.id}
          projectName={trackModalProject.name}
        />
      )}
    </div>
  );
}
