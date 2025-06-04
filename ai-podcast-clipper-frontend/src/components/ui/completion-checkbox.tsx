"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";

interface CompletionCheckboxProps {
  isCompleted: boolean;
  onToggle: (completed: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "fun";
}

export function CompletionCheckbox({
  isCompleted,
  onToggle,
  disabled = false,
  size = "md",
  variant = "fun",
}: CompletionCheckboxProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (disabled) return;

    setIsAnimating(true);
    onToggle(!isCompleted);

    // Reset animation after completion
    setTimeout(() => setIsAnimating(false), 600);
  };

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (variant === "fun") {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "relative rounded-full border-2 transition-all duration-300 ease-out",
          "hover:scale-110 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
          sizeClasses[size],
          isCompleted
            ? "border-green-500 bg-gradient-to-r from-green-400 to-green-600 shadow-lg shadow-green-200"
            : "border-gray-300 bg-white hover:border-green-400",
          isAnimating && isCompleted && "animate-bounce",
        )}
      >
        {isCompleted && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center text-white",
              isAnimating && "animate-pulse",
            )}
          >
            {/* Checkmark icon */}
            <svg
              className={iconSizeClasses[size]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}

        {/* Sparkle effect on completion */}
        {isAnimating && isCompleted && (
          <>
            <div className="absolute -top-1 -right-1 h-2 w-2 animate-ping rounded-full bg-yellow-400" />
            <div className="absolute -bottom-1 -left-1 h-1.5 w-1.5 animate-ping rounded-full bg-yellow-300 delay-100" />
            <div className="absolute -top-1 -left-1 h-1 w-1 animate-ping rounded-full bg-yellow-500 delay-200" />
          </>
        )}
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "relative rounded border-2 transition-all duration-200",
        "hover:scale-105 focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        sizeClasses[size],
        isCompleted
          ? "border-blue-600 bg-blue-600"
          : "border-gray-300 bg-white hover:border-blue-400",
      )}
    >
      {isCompleted && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <svg
            className={iconSizeClasses[size]}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
