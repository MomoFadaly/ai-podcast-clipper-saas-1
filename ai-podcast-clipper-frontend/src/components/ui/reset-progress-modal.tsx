"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface ResetProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  itemCount?: number;
  itemType: "clip" | "project" | "track";
  itemName?: string;
}

export function ResetProgressModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemCount,
  itemType,
  itemName,
}: ResetProgressModalProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error resetting progress:", error);
      // Error handling is done in the parent component
    } finally {
      setIsResetting(false);
    }
  };

  const getIconAndColors = () => {
    switch (itemType) {
      case "clip":
        return {
          icon: RotateCcw,
          primaryColor: "text-blue-600",
          bgColor: "bg-blue-50",
          buttonColor: "bg-blue-600 hover:bg-blue-700",
        };
      case "project":
        return {
          icon: RotateCcw,
          primaryColor: "text-purple-600",
          bgColor: "bg-purple-50",
          buttonColor: "bg-purple-600 hover:bg-purple-700",
        };
      case "track":
        return {
          icon: RotateCcw,
          primaryColor: "text-orange-600",
          bgColor: "bg-orange-50",
          buttonColor: "bg-orange-600 hover:bg-orange-700",
        };
    }
  };

  const { icon: Icon, primaryColor, bgColor, buttonColor } = getIconAndColors();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn("px-6 py-4", bgColor)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-full p-2", "bg-white/80")}>
                  <Icon className={cn("h-5 w-5", primaryColor)} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h2>
                  {itemName && (
                    <p className="text-sm text-gray-600">{itemName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/50 hover:text-gray-600"
                disabled={isResetting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="mt-1 rounded-full bg-yellow-100 p-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">{description}</p>
                {itemCount !== undefined && (
                  <p className="mt-2 text-sm font-medium text-gray-800">
                    This will reset progress for{" "}
                    <span className={cn("font-bold", primaryColor)}>
                      {itemCount}
                    </span>{" "}
                    {itemCount === 1 ? "item" : "items"}.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">
                <strong>What will be reset:</strong>
              </p>
              <ul className="mt-1 text-xs text-gray-600">
                <li>• Watch progress and time</li>
                <li>• Completion status</li>
                <li>• Completion dates</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isResetting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isResetting}
                className={cn("flex-1 text-white", buttonColor)}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Progress
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
