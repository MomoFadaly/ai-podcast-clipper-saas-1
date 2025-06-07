"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Clock,
  Play,
  Calendar,
  RotateCcw,
  Search,
  Grid3x3,
  List,
  Filter,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  useTrack,
  useTrackProjects,
  useDeleteTrack,
  useRemoveProjectFromTrack,
  useUpdateTrack,
} from "~/hooks/use-tracks";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import AddProjectsToTrackModal from "~/components/tracks/add-projects-to-track-modal";
import SortableProjectsList from "~/components/tracks/sortable-projects-list";
import { InlineEdit } from "~/components/ui/inline-edit";
import { ResetProgressModal } from "~/components/ui/reset-progress-modal";
import { SelectionProvider, useSelection } from "~/contexts/selection-context";
import { SelectionToolbar } from "~/components/ui/selection-toolbar";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

interface TrackDetailPageProps {
  params: Promise<{ trackId: string }>;
}

function TrackDetailPageContent({ params }: TrackDetailPageProps) {
  const { trackId } = use(params);
  const {
    data: track,
    isLoading: trackLoading,
    error: trackError,
  } = useTrack(trackId);
  const { data: projects = [], isLoading: projectsLoading } =
    useTrackProjects(trackId);
  const deleteTrackMutation = useDeleteTrack();
  const removeProjectMutation = useRemoveProjectFromTrack();
  const updateTrackMutation = useUpdateTrack();

  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);

  const {
    isSelectionMode,
    toggleSelectionMode,
    getSelectedCount,
    selectedItems,
    clearSelection,
  } = useSelection();

  if (trackLoading) {
    return (
      <div className="mx-auto w-full px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 rounded bg-gray-200"></div>
          <div className="h-64 rounded-xl bg-gray-200"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (trackError || !track) {
    return notFound();
  }

  const handleDeleteTrack = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${track.name}"? This will remove all project associations but won't delete the projects themselves.`,
      )
    ) {
      try {
        await deleteTrackMutation.mutateAsync(trackId);
        // Redirect back to library after deletion
        window.location.href = "/dashboard/library?tab=tracks";
      } catch (error) {
        console.error("Failed to delete track:", error);
        toast.error("Failed to delete track. Please try again.");
      }
    }
  };

  const handleRemoveProject = async (
    projectId: string,
    projectName: string,
  ) => {
    if (
      window.confirm(
        `Are you sure you want to remove "${projectName}" from this track?`,
      )
    ) {
      try {
        await removeProjectMutation.mutateAsync({ projectId, trackId });
      } catch (error) {
        console.error("Failed to remove project:", error);
        toast.error("Failed to remove project. Please try again.");
      }
    }
  };

  const handleTrackRename = async (newName: string) => {
    try {
      await updateTrackMutation.mutateAsync({
        trackId,
        data: { name: newName.trim() },
      });
    } catch (error) {
      console.error("Failed to rename track:", error);
      throw error; // Re-throw so InlineEdit can handle the error
    }
  };

  const handleResetTrackProgress = async () => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errorData.message ?? "Failed to reset track progress");
      }

      const result = (await response.json()) as {
        resettedClipsCount: number;
        projectsCount: number;
      };
      toast.success(
        `Track progress reset successfully! 🎉 Reset ${result.resettedClipsCount} clips across ${result.projectsCount} projects.`,
      );

      // The data should automatically refresh due to React Query
    } catch (error) {
      console.error("Error resetting track progress:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset track progress",
      );
    }
  };

  const handleBulkRemoveFromTrack = async () => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to remove ${selectedIds.length} project${selectedIds.length === 1 ? "" : "s"} from this track? The projects themselves will not be deleted.`,
      )
    ) {
      return;
    }

    setIsBulkRemoving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Remove each project from track individually
      for (const projectId of selectedIds) {
        try {
          await removeProjectMutation.mutateAsync({ projectId, trackId });
          successCount++;
        } catch (error) {
          console.error(
            `Error removing project ${projectId} from track:`,
            error,
          );
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(
          `Successfully removed ${successCount} project${successCount === 1 ? "" : "s"} from track`,
        );

        // Clear selection - data should automatically refresh due to React Query
        clearSelection();
      }

      if (errorCount > 0) {
        toast.error(
          `Failed to remove ${errorCount} project${errorCount === 1 ? "" : "s"} from track. Please try again.`,
        );
      }
    } catch (error) {
      console.error("Bulk remove error:", error);
      toast.error("An error occurred during bulk remove. Please try again.");
    } finally {
      setIsBulkRemoving(false);
    }
  };

  const trackColor = track.color ?? "#3B82F6";
  const progressPercentage = track.totalProgress ?? 0;

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return project.displayName?.toLowerCase().includes(query) ?? false;
  });

  return (
    <div className="mx-auto w-full px-4 sm:px-6 lg:max-w-7xl lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/library?tab=tracks"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <InlineEdit
              value={track.name}
              onSave={handleTrackRename}
              placeholder="Track name"
              className="text-2xl font-bold text-gray-900 sm:text-3xl"
              variant="large"
            />
            <p className="mt-1 text-sm text-gray-600">
              Learning Track • {track.projectCount} projects
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Reset Progress - only show if there's progress to reset */}
              {progressPercentage > 0 && (
                <DropdownMenuItem
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-purple-600 focus:text-purple-600"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Progress
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDeleteTrack}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Track
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Track Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        >
          {/* Color accent bar */}
          <div className="h-2 w-full" style={{ backgroundColor: trackColor }} />

          <div className="p-6">
            {/* Track Info */}
            <div className="mb-6 flex items-start space-x-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl"
                style={{
                  backgroundColor: `${trackColor}20`,
                  color: trackColor,
                }}
              >
                {track.icon ?? "📚"}
              </div>
              <div className="flex-1">
                <InlineEdit
                  value={track.name}
                  onSave={handleTrackRename}
                  placeholder="Track name"
                  className="text-xl font-semibold text-gray-900"
                  variant="large"
                />
                {track.description && (
                  <p className="mt-1 text-gray-600">{track.description}</p>
                )}
                <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    Created {new Date(track.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    Updated {new Date(track.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {track.projectCount}
                </div>
                <div className="text-sm text-gray-600">Total Projects</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {track.completedProjects}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {progressPercentage}%
                </div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {track.projectCount - track.completedProjects}
                </div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium text-gray-900">
                  {progressPercentage}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: trackColor }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Projects in this track ({filteredProjects.length}
              {searchQuery && projects.length !== filteredProjects.length && (
                <span className="text-gray-500"> of {projects.length}</span>
              )}
              )
              <span className="ml-2 text-sm font-normal text-gray-500">
                • Drag to reorder
              </span>
            </h3>
            <Button size="sm" onClick={() => setIsAddProjectModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>

          {/* Search and Filter Bar */}
          <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              {/* Search */}
              <div className="relative flex-1 lg:max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400 sm:h-5 sm:w-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="block h-9 w-full rounded-lg border border-gray-300 bg-gray-50 pr-3 pl-9 text-sm text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none sm:h-10 sm:pl-10"
                />
              </div>

              {/* View Options */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Selection Toggle */}
                <motion.button
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleSelectionMode}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:h-10 sm:px-4",
                    isSelectionMode
                      ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {isSelectionMode ? (
                    <CheckSquare className="mr-1.5 h-4 w-4 flex-shrink-0 sm:mr-2" />
                  ) : (
                    <Square className="mr-1.5 h-4 w-4 flex-shrink-0 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">
                    {isSelectionMode ? "Exit Select" : "Select"}
                  </span>
                  <span className="sm:hidden">
                    {isSelectionMode ? "Exit" : "Select"}
                  </span>
                </motion.button>

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
                    <Grid3x3 className="h-4 w-4" />
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

                {/* Filter Button */}
                <button className="inline-flex h-9 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:h-10 sm:px-4">
                  <Filter className="mr-1.5 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  <span className="sm:hidden">Filter</span>
                </button>
              </div>
            </div>
          </div>

          {/* Selection Toolbar */}
          <SelectionToolbar
            activeTab="projects"
            onBulkDelete={handleBulkRemoveFromTrack}
            onBulkAddToTrack={() => {
              // TODO: Implement bulk move to different track functionality
              console.log(
                "Bulk move:",
                getSelectedCount(),
                "projects to different track",
              );
            }}
            isLoading={isBulkRemoving}
            deleteButtonText="Remove from Track"
            deleteLoadingText="Removing..."
          />

          {projectsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-gray-200"
                />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h4 className="mt-2 text-lg font-medium text-gray-900">
                {searchQuery ? "No projects found" : "No projects yet"}
              </h4>
              <p className="mt-1 text-gray-500">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Add some projects to start organizing your learning journey."}
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setIsAddProjectModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Project
                </Button>
              )}
            </div>
          ) : (
            <SortableProjectsList
              projects={filteredProjects}
              trackId={trackId}
              onRemoveProject={handleRemoveProject}
              isLoading={projectsLoading}
              isSelectionMode={isSelectionMode}
              layout={layout}
            />
          )}
        </div>
      </div>

      {/* Add Projects to Track Modal */}
      {isAddProjectModalOpen && (
        <AddProjectsToTrackModal
          isOpen={isAddProjectModalOpen}
          onClose={() => setIsAddProjectModalOpen(false)}
          trackId={trackId}
          trackName={track.name}
        />
      )}

      {/* Reset Progress Modal */}
      <ResetProgressModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetTrackProgress}
        title="Reset Track Progress"
        description="This will reset your viewing progress for ALL chunks in ALL projects within this track. This action will affect multiple projects at once."
        itemCount={projects.length}
        itemType="track"
        itemName={track.name}
      />
    </div>
  );
}

export default function TrackDetailPage({ params }: TrackDetailPageProps) {
  return (
    <SelectionProvider>
      <TrackDetailPageContent params={params} />
    </SelectionProvider>
  );
}
