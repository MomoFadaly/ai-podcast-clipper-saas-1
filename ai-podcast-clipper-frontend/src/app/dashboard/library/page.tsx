"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  FolderOpen,
  Route,
  Plus,
  Grid3x3,
  List,
  Filter,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import ProjectsView from "./projects-view";
import TracksView from "./tracks-view";
import { cn } from "~/lib/utils";
import TrackFormModal from "~/components/tracks/track-form-modal";
import { SelectionProvider, useSelection } from "~/contexts/selection-context";
import { SelectionToolbar } from "~/components/ui/selection-toolbar";
import { deleteProject } from "~/actions/projects";
import { deleteTrack } from "~/actions/tracks";
import { useProjects } from "~/hooks/use-projects";
import { useTracks } from "~/hooks/use-tracks";
import { toast } from "sonner";

type ViewType = "tracks" | "projects";
type LayoutType = "grid" | "list";

function LibraryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"projects" | "tracks">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const {
    isSelectionMode,
    toggleSelectionMode,
    getSelectedCount,
    selectedItems,
    clearSelection,
  } = useSelection();

  // Data hooks for refetching after bulk operations
  const { refetch: refetchProjects } = useProjects();
  const { refetch: refetchTracks } = useTracks();

  useEffect(() => {
    // Check URL parameter first, then fall back to localStorage
    const urlTab = searchParams.get("tab");
    if (urlTab === "projects" || urlTab === "tracks") {
      setActiveTab(urlTab);
      // Also save to localStorage for future visits
      localStorage.setItem("libraryActiveTab", urlTab);
    } else {
      // No URL parameter, check localStorage
      const savedTab = localStorage.getItem("libraryActiveTab");
      if (savedTab === "projects" || savedTab === "tracks") {
        setActiveTab(savedTab);
        // Update URL to match localStorage - but only once to prevent infinite loop
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("tab", savedTab);
        router.replace(newUrl.pathname + newUrl.search);
      }
    }
  }, [searchParams.get("tab"), router]); // Only depend on the tab parameter, not entire searchParams

  const handleTabChange = (newTab: "projects" | "tracks") => {
    setActiveTab(newTab);
    localStorage.setItem("libraryActiveTab", newTab);

    // Update URL to match the new tab
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("tab", newTab);
    router.replace(newUrl.pathname + newUrl.search);
  };

  const handleLayoutChange = (newLayout: "grid" | "list") => {
    setLayout(newLayout);
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleBulkDeleteProjects = async () => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} project${selectedIds.length === 1 ? "" : "s"}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Delete each project individually
      for (const projectId of selectedIds) {
        try {
          const success = await deleteProject(projectId);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error deleting project ${projectId}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(
          `Successfully deleted ${successCount} project${successCount === 1 ? "" : "s"}`,
        );

        // Clear selection and refetch data
        clearSelection();
        await refetchProjects();
      }

      if (errorCount > 0) {
        toast.error(
          `Failed to delete ${errorCount} project${errorCount === 1 ? "" : "s"}. Please try again.`,
        );
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("An error occurred during bulk delete. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeleteTracks = async () => {
    const selectedIds = Array.from(selectedItems);
    if (selectedIds.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.length} track${selectedIds.length === 1 ? "" : "s"}? This will remove all project associations but won't delete the projects themselves.`,
      )
    ) {
      return;
    }

    setIsBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Delete each track individually
      for (const trackId of selectedIds) {
        try {
          const success = await deleteTrack(trackId);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error deleting track ${trackId}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(
          `Successfully deleted ${successCount} track${successCount === 1 ? "" : "s"}`,
        );

        // Clear selection and refetch data
        clearSelection();
        await refetchTracks();
      }

      if (errorCount > 0) {
        toast.error(
          `Failed to delete ${errorCount} track${errorCount === 1 ? "" : "s"}. Please try again.`,
        );
      }
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("An error occurred during bulk delete. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const tabs = [
    {
      id: "tracks" as ViewType,
      label: "Learning Tracks",
      shortLabel: "Tracks",
      icon: Route,
      description: "Curated learning paths",
    },
    {
      id: "projects" as ViewType,
      label: "Projects",
      shortLabel: "Projects",
      icon: FolderOpen,
      description: "Individual videos",
    },
  ];

  return (
    <LayoutGroup>
      <div className="mx-auto w-full px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Header - Mobile optimized */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  Library
                </h1>
                <p className="mt-1 text-sm text-gray-600 sm:text-base">
                  Organize and track your learning journey
                </p>
              </div>

              {/* Quick Actions - Mobile optimized */}
              <div className="flex-shrink-0">
                <motion.button
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (activeTab === "projects") {
                      window.location.href = "/dashboard/new-project";
                    } else {
                      handleOpenCreateModal();
                    }
                  }}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:w-auto sm:min-w-[140px]"
                >
                  <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {activeTab === "tracks" ? "New Track" : "New Project"}
                  </span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* View Tabs - Mobile optimized */}
          <div className="relative">
            <div className="flex space-x-1 rounded-xl bg-gray-100 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "relative flex flex-1 items-center justify-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:space-x-2 sm:px-4 sm:py-2.5",
                    activeTab === tab.id
                      ? "text-gray-900"
                      : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                  <tab.icon className="z-10 h-4 w-4 flex-shrink-0" />
                  <span className="relative z-10 hidden sm:inline">
                    {tab.label}
                  </span>
                  <span className="relative z-10 sm:hidden">
                    {tab.shortLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters and Search Bar - Mobile optimized */}
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
                  placeholder={`Search ${activeTab}...`}
                  className="block h-9 w-full rounded-lg border border-gray-300 bg-gray-50 pr-3 pl-9 text-sm text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none sm:h-10 sm:pl-10"
                />
              </div>

              {/* View Options - Mobile optimized */}
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
                    onClick={() => handleLayoutChange("grid")}
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
                    onClick={() => handleLayoutChange("list")}
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
            activeTab={activeTab}
            onBulkDelete={
              activeTab === "projects"
                ? handleBulkDeleteProjects
                : handleBulkDeleteTracks
            }
            onBulkAddToTrack={() => {
              // TODO: Implement bulk add to track functionality
              console.log("Bulk add to track:", getSelectedCount(), "projects");
            }}
            isLoading={isBulkDeleting}
          />

          {/* Content View - Mobile optimized */}
          <div className="relative min-h-[400px] pb-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.2,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="absolute inset-0"
              >
                {activeTab === "tracks" ? (
                  <TracksView
                    layoutType={layout}
                    searchQuery={searchQuery}
                    onOpenCreateModal={handleOpenCreateModal}
                    isSelectionMode={isSelectionMode}
                  />
                ) : (
                  <ProjectsView
                    layoutType={layout}
                    searchQuery={searchQuery}
                    isSelectionMode={isSelectionMode}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <TrackFormModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        mode="create"
      />
    </LayoutGroup>
  );
}

export default function LibraryPage() {
  return (
    <SelectionProvider>
      <LibraryPageContent />
    </SelectionProvider>
  );
}
