"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Route, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useSelection } from "~/contexts/selection-context";
import { cn } from "~/lib/utils";

interface SelectionToolbarProps {
  activeTab: "projects" | "tracks";
  onBulkDelete?: () => void;
  onBulkMoveToTrack?: () => void;
  onBulkAddToTrack?: () => void;
  isLoading?: boolean;
  deleteButtonText?: string;
  deleteLoadingText?: string;
  className?: string;
}

export function SelectionToolbar({
  activeTab,
  onBulkDelete,
  onBulkMoveToTrack,
  onBulkAddToTrack,
  isLoading = false,
  deleteButtonText = "Delete",
  deleteLoadingText = "Deleting...",
  className,
}: SelectionToolbarProps) {
  const { clearSelection, getSelectedCount, toggleSelectionMode } =
    useSelection();
  const selectedCount = getSelectedCount();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={cn(
          "flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm",
          "dark:border-blue-800 dark:bg-blue-950",
          className,
        )}
      >
        {/* Selected Count */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
              {selectedCount}
            </div>
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedCount} {activeTab === "projects" ? "project" : "track"}
              {selectedCount === 1 ? "" : "s"} selected
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Bulk Actions */}
          <div className="flex items-center space-x-1">
            {activeTab === "projects" && onBulkAddToTrack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkAddToTrack}
                className="h-8 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
              >
                <Route className="mr-1.5 h-3.5 w-3.5" />
                Add to Track
              </Button>
            )}

            {activeTab === "tracks" && onBulkMoveToTrack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkMoveToTrack}
                className="h-8 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
              >
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                Move
              </Button>
            )}

            {onBulkDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkDelete}
                disabled={isLoading}
                className="h-8 border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 disabled:opacity-50 dark:border-red-700 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
              >
                {isLoading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isLoading ? deleteLoadingText : deleteButtonText}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-blue-300 dark:bg-blue-700" />

          {/* Clear Selection */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSelection();
              toggleSelectionMode();
            }}
            className="h-8 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-200 dark:hover:bg-blue-800 dark:hover:text-blue-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
