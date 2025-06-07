"use client";

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Play,
  MoreHorizontal,
  Trash2,
  GripVertical,
  Calendar,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { useUpdateProjectOrder, useRenameProject } from "~/hooks/use-tracks";
import { InlineEdit } from "~/components/ui/inline-edit";
import { Checkbox } from "~/components/ui/checkbox";
import { SelectAllCheckbox } from "~/components/ui/select-all-checkbox";
import { useSelection } from "~/contexts/selection-context";
import { cn } from "~/lib/utils";

interface Project {
  id: string;
  displayName?: string | null;
  status: string;
  createdAt: Date;
  addedToTrackAt?: Date;
}

interface SortableProjectsListProps {
  projects: Project[];
  trackId: string;
  onRemoveProject: (projectId: string, projectName: string) => void;
  isLoading?: boolean;
  isSelectionMode?: boolean;
  layout?: "grid" | "list";
}

interface SortableProjectItemProps {
  project: Project;
  index: number;
  onRemoveProject: (projectId: string, projectName: string) => void;
  onRenameProject: (projectId: string, newName: string) => Promise<void>;
  isSelectionMode?: boolean;
  layout?: "grid" | "list";
}

interface ProjectCardProps {
  project: Project;
  onRemoveProject?: (projectId: string, projectName: string) => void;
  onRenameProject?: (projectId: string, newName: string) => Promise<void>;
  isDragOverlay?: boolean;
  isSelectionMode?: boolean;
  layout?: "grid" | "list";
}

function ProjectCard({
  project,
  onRemoveProject,
  onRenameProject,
  isDragOverlay = false,
  isSelectionMode = false,
  layout = "list",
}: ProjectCardProps) {
  const { toggleItemSelection, isItemSelected } = useSelection();

  if (layout === "grid") {
    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-lg border border-gray-200 bg-white transition-all duration-200",
          isDragOverlay
            ? "ring-opacity-60 scale-105 shadow-xl ring-2 ring-blue-500"
            : "cursor-pointer hover:border-gray-300 hover:shadow-lg",
        )}
      >
        {/* Selection Checkbox - Grid */}
        {isSelectionMode && !isDragOverlay && (
          <div
            className="absolute top-3 left-3 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isItemSelected(project.id)}
              onCheckedChange={() => toggleItemSelection(project.id)}
              className="h-5 w-5 bg-white/90 backdrop-blur-sm"
            />
          </div>
        )}

        {/* Full Card Link - Only active if not in drag overlay and not in selection mode */}
        {!isDragOverlay && !isSelectionMode && (
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="absolute inset-0 z-10"
            aria-label={`View project: ${project.displayName ?? `Project ${project.id.slice(0, 8)}`}`}
          />
        )}

        {/* Drag Handle Space - Grid */}
        {!isDragOverlay && !isSelectionMode && (
          <div className="absolute top-3 right-3 z-20 flex items-center text-transparent">
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        {/* Project Thumbnail/Icon */}
        <div className="aspect-video bg-gray-100">
          <div className="flex h-full items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-2">
            <InlineEdit
              value={project.displayName ?? `Project ${project.id.slice(0, 8)}`}
              onSave={(newName) =>
                onRenameProject?.(project.id, newName) ?? Promise.resolve()
              }
              placeholder="Project name"
              className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-blue-600 sm:text-base"
              variant="default"
              disabled={!onRenameProject}
            />
          </div>
          <div className="mb-3 flex items-center text-xs text-gray-500 sm:text-sm">
            <span className="flex items-center">
              <Calendar className="mr-1 h-3 w-3" />
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Actions - Grid */}
          {!isDragOverlay && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600 capitalize">
                {project.status}
              </span>
              <div className="relative z-20 flex items-center">
                {onRemoveProject && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          onRemoveProject?.(
                            project.id,
                            project.displayName ?? "Project",
                          )
                        }
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove from Track
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List Layout
  return (
    <div
      className={cn(
        "group relative flex items-center space-x-4 rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200",
        isDragOverlay
          ? "ring-opacity-60 scale-105 shadow-xl ring-2 ring-blue-500"
          : "cursor-pointer hover:bg-gray-50 hover:shadow-sm",
      )}
    >
      {/* Selection Checkbox - List */}
      {isSelectionMode && !isDragOverlay && (
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isItemSelected(project.id)}
            onCheckedChange={() => toggleItemSelection(project.id)}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Full Card Link - Only active if not in drag overlay and not in selection mode */}
      {!isDragOverlay && !isSelectionMode && (
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="absolute inset-0 z-10"
          aria-label={`View project: ${project.displayName ?? `Project ${project.id.slice(0, 8)}`}`}
        />
      )}

      {/* Drag Handle Space - Only show if not in overlay and not in selection mode */}
      {!isDragOverlay && !isSelectionMode && (
        <div className="flex items-center text-transparent">
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      {/* Project Icon */}
      <div className="flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Play className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* Project Info */}
      <div className="min-w-0 flex-1">
        <InlineEdit
          value={project.displayName ?? `Project ${project.id.slice(0, 8)}`}
          onSave={(newName) =>
            onRenameProject?.(project.id, newName) ?? Promise.resolve()
          }
          placeholder="Project name"
          className="group-hover:text-blue-600"
          variant="default"
          disabled={!onRenameProject}
        />
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center">
            <Calendar className="mr-1 h-3 w-3" />
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
          <span className="capitalize">Status: {project.status}</span>
        </div>
      </div>

      {/* Actions - Only show if not in overlay */}
      {!isDragOverlay && (
        <div className="relative z-30 flex items-center space-x-2">
          {onRemoveProject && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    onRemoveProject?.(
                      project.id,
                      project.displayName ?? "Project",
                    )
                  }
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove from Track
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}

function SortableProjectItem({
  project,
  index,
  onRemoveProject,
  onRenameProject,
  isSelectionMode = false,
  layout = "list",
}: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 150ms ease",
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isDragging ? 0.3 : 1,
        y: 0,
        scale: isDragging ? 0.95 : 1,
      }}
      transition={{
        duration: 0.2,
        delay: isDragging ? 0 : index * 0.03,
        ease: "easeOut",
      }}
      className={isDragging ? "z-10" : ""}
    >
      <div className="relative">
        {/* Drag Handle Overlay - Only show if not in selection mode */}
        {!isSelectionMode && (
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "absolute z-30 flex items-center transition-all duration-200",
              layout === "grid"
                ? "top-4 right-4"
                : "top-1/2 left-4 -translate-y-1/2",
              isDragging
                ? "scale-110 cursor-grabbing text-blue-500"
                : "cursor-grab text-gray-400 hover:scale-110 hover:text-gray-600",
            )}
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        {/* Project Card */}
        <ProjectCard
          project={project}
          onRemoveProject={onRemoveProject}
          onRenameProject={onRenameProject}
          isSelectionMode={isSelectionMode}
          layout={layout}
        />
      </div>
    </motion.div>
  );
}

export default function SortableProjectsList({
  projects,
  trackId,
  onRemoveProject,
  isLoading = false,
  isSelectionMode = false,
  layout = "list",
}: SortableProjectsListProps) {
  const [localProjects, setLocalProjects] = useState(projects);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const updateOrderMutation = useUpdateProjectOrder();
  const renameProjectMutation = useRenameProject();

  // Update local state when projects prop changes
  React.useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Disable drag and drop when in selection mode
  const isDragDisabled = isSelectionMode;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (isDragDisabled) return;
      const { active } = event;
      const project = localProjects.find((p) => p.id === active.id);
      setActiveProject(project || null);
    },
    [localProjects, isDragDisabled],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (isDragDisabled) return;
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = localProjects.findIndex(
          (project) => project.id === active.id,
        );
        const newIndex = localProjects.findIndex(
          (project) => project.id === over.id,
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          setLocalProjects((projects) =>
            arrayMove(projects, oldIndex, newIndex),
          );
        }
      }
    },
    [localProjects, isDragDisabled],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveProject(null);
      if (isDragDisabled) return;

      const { active, over } = event;

      if (over && active.id !== over.id) {
        // Create the new order mapping based on current local state
        const projectOrders = localProjects.map((project, index) => ({
          projectId: project.id,
          order: index,
        }));

        // Update the order in the backend
        updateOrderMutation.mutate({
          trackId,
          projectOrders,
        });
      }
    },
    [localProjects, trackId, updateOrderMutation, isDragDisabled],
  );

  const handleRenameProject = useCallback(
    async (projectId: string, newName: string) => {
      try {
        await renameProjectMutation.mutateAsync({
          projectId,
          displayName: newName.trim(),
        });

        // Update local state optimistically
        setLocalProjects((prev) =>
          prev.map((project) =>
            project.id === projectId
              ? { ...project, displayName: newName.trim() }
              : project,
          ),
        );
      } catch (error) {
        console.error("Failed to rename project:", error);
        throw error; // Re-throw so InlineEdit can handle the error
      }
    },
    [renameProjectMutation],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (localProjects.length === 0) {
    return null; // This will be handled by the parent component's empty state
  }

  return (
    <>
      {/* Select All Checkbox */}
      {isSelectionMode && (
        <SelectAllCheckbox
          availableItems={localProjects.map((project) => project.id)}
          label="Select all projects"
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localProjects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={cn(
              layout === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
                : "space-y-3",
            )}
          >
            {localProjects.map((project, index) => (
              <SortableProjectItem
                key={project.id}
                project={project}
                index={index}
                onRemoveProject={onRemoveProject}
                onRenameProject={handleRenameProject}
                isSelectionMode={isSelectionMode}
                layout={layout}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease-out" }}>
          {activeProject ? (
            <ProjectCard
              project={activeProject}
              isDragOverlay={true}
              layout={layout}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
