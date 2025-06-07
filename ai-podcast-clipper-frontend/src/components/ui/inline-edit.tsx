"use client";

import React, { useState, useRef, useEffect } from "react";
import { Edit2, Check, X } from "lucide-react";
import { cn } from "~/lib/utils";

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showEditIcon?: boolean;
  disabled?: boolean;
  maxLength?: number;
  variant?: "default" | "large";
}

export function InlineEdit({
  value,
  onSave,
  placeholder = "Enter text...",
  className = "",
  inputClassName = "",
  showEditIcon = true,
  disabled = false,
  maxLength,
  variant = "default",
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue || trimmedValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      // Keep editing mode open on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isSaving}
          className={cn(
            "rounded border border-blue-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none",
            variant === "large" && "text-base font-semibold",
            inputClassName,
          )}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={isSaving || !editValue.trim()}
            className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded p-1 text-gray-400 hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-center gap-1", className)}>
      <span
        className={cn(
          variant === "large" && "text-base font-semibold",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {value || placeholder}
      </span>
      {showEditIcon && !disabled && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleStartEdit();
          }}
          className="hover:ring-opacity-50 relative z-50 rounded-md p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:shadow-lg hover:ring-2 hover:shadow-blue-200 hover:ring-blue-200"
          aria-label="Edit"
          title="Click to edit"
        >
          <Edit2 className="h-3 w-3 text-gray-400 hover:text-blue-600" />
        </button>
      )}
    </div>
  );
}
