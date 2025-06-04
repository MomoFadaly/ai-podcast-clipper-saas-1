"use client";

import { cn } from "~/lib/utils";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: "sm" | "md" | "lg";
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  progress,
  size = "md",
  strokeWidth = 3,
  className,
}: ProgressRingProps) {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
  };

  const radius = sizeMap[size] / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        width={sizeMap[size]}
        height={sizeMap[size]}
        className="-rotate-90 transform"
      >
        {/* Background circle */}
        <circle
          cx={sizeMap[size] / 2}
          cy={sizeMap[size] / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />

        {/* Progress circle */}
        <circle
          cx={sizeMap[size] / 2}
          cy={sizeMap[size] / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-all duration-500 ease-out",
            progress >= 100
              ? "text-green-500"
              : progress > 0
                ? "text-blue-500"
                : "text-gray-300",
          )}
          strokeLinecap="round"
        />
      </svg>

      {/* Progress text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "font-medium",
            size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base",
            progress >= 100 ? "text-green-600" : "text-gray-600",
          )}
        >
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
