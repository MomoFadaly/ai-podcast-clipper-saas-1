"use client";

import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

interface CompletionCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

export function CompletionCelebration({
  show,
  onComplete,
}: CompletionCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div className="absolute inset-0 animate-pulse bg-black/20" />

      {/* Celebration content */}
      <div className="relative mx-4 max-w-md transform animate-bounce rounded-2xl bg-white p-8 text-center shadow-2xl">
        {/* Confetti effect */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute h-2 w-2 animate-ping rounded-full",
                i % 4 === 0 && "bg-yellow-400",
                i % 4 === 1 && "bg-green-400",
                i % 4 === 2 && "bg-blue-400",
                i % 4 === 3 && "bg-red-400",
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1000}ms`,
                animationDuration: `${1000 + Math.random() * 1000}ms`,
              }}
            />
          ))}
        </div>

        {/* Trophy icon */}
        <div className="relative z-10 mb-4">
          <div className="inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
            <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V16C19 17.1 18.1 18 17 18H7C5.9 18 5 17.1 5 16V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V16H17V6H7Z" />
              <path d="M9 8H15V10H9V8ZM9 12H15V14H9V12Z" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          🎉 Project Complete! 🎉
        </h2>
        <p className="mb-4 text-gray-600">
          Congratulations! You've completed all chunks in this learning project.
        </p>

        {/* Achievement badge */}
        <div className="inline-flex items-center rounded-full bg-gradient-to-r from-green-400 to-green-600 px-4 py-2 text-sm font-medium text-white">
          <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Achievement Unlocked!
        </div>
      </div>

      {/* Floating elements */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${20 + i * 15}%`,
              top: `${20 + (i % 2) * 30}%`,
              animationDelay: `${i * 200}ms`,
              animationDuration: "2s",
            }}
          >
            <span className="text-2xl">
              {["🎉", "✨", "🏆", "🎊", "⭐", "🚀"][i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
