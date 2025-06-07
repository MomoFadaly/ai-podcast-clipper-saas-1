"use client";

/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { useCreateTrack, useUpdateTrack } from "~/hooks/use-tracks";
import type {
  TrackWithStats,
  CreateTrackData,
  UpdateTrackData,
} from "~/actions/tracks";

interface TrackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  track?: TrackWithStats;
}

// Predefined colors for tracks
const trackColors = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Emerald", value: "#10B981" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Red", value: "#EF4444" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Lime", value: "#84CC16" },
  { name: "Orange", value: "#F97316" },
  { name: "Pink", value: "#EC4899" },
  { name: "Indigo", value: "#6366F1" },
];

export default function TrackFormModal({
  isOpen,
  onClose,
  mode,
  track,
}: TrackFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: trackColors[0]!.value,
    icon: "",
  });

  const createTrackMutation = useCreateTrack();
  const updateTrackMutation = useUpdateTrack();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && track) {
        setFormData({
          name: track.name,
          description: track.description ?? "",
          color: track.color ?? trackColors[0]!.value,
          icon: track.icon ?? "",
        });
      } else {
        setFormData({
          name: "",
          description: "",
          color: trackColors[0]!.value,
          icon: "",
        });
      }
    }
  }, [isOpen, mode, track]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Track name is required");
      return;
    }

    try {
      if (mode === "create") {
        const createData: CreateTrackData = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon.trim() || undefined,
        };

        const result = await createTrackMutation.mutateAsync(createData);
        if (result.success) {
          onClose();
        } else {
          alert(result.error || "Failed to create track");
        }
      } else if (mode === "edit" && track) {
        const updateData: UpdateTrackData = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          color: formData.color,
          icon: formData.icon.trim() || undefined,
        };

        const success = await updateTrackMutation.mutateAsync({
          trackId: track.id,
          data: updateData,
        });

        if (success) {
          onClose();
        } else {
          alert("Failed to update track");
        }
      }
    } catch (error) {
      console.error("Error saving track:", error);
      alert("Failed to save track. Please try again.");
    }
  };

  const isLoading =
    createTrackMutation.isPending || updateTrackMutation.isPending;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === "create" ? "Create New Track" : "Edit Track"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Track Name */}
              <div>
                <Label htmlFor="track-name" className="text-sm font-medium">
                  Track Name *
                </Label>
                <Input
                  id="track-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., React Learning Path"
                  className="mt-1"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label
                  htmlFor="track-description"
                  className="text-sm font-medium"
                >
                  Description (Optional)
                </Label>
                <Textarea
                  id="track-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this track covers..."
                  className="mt-1 min-h-[80px]"
                  rows={3}
                />
              </div>

              {/* Color Selection */}
              <div>
                <Label className="text-sm font-medium">Track Color</Label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {trackColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color: color.value }))
                      }
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        formData.color === color.value
                          ? "scale-110 border-gray-900"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon (Optional - for future enhancement) */}
              <div>
                <Label htmlFor="track-icon" className="text-sm font-medium">
                  Icon (Optional)
                </Label>
                <Input
                  id="track-icon"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, icon: e.target.value }))
                  }
                  placeholder="e.g., 🚀"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can use emoji or leave empty for default icon
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !formData.name.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {mode === "create" ? "Create Track" : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
