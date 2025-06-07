"use client";

import Link from "next/link";
import { Route } from "lucide-react";
import { cn } from "~/lib/utils";

interface TrackBadgeProps {
  track: {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
  };
  size?: "sm" | "md";
  showIcon?: boolean;
  clickable?: boolean;
  className?: string;
}

export default function TrackBadge({
  track,
  size = "sm",
  showIcon = true,
  clickable = true,
  className,
}: TrackBadgeProps) {
  const trackColor = track.color ?? "#3B82F6";
  const maxLength = size === "sm" ? 15 : 25;
  const displayName =
    track.name.length > maxLength
      ? `${track.name.slice(0, maxLength)}...`
      : track.name;

  const badgeContent = (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-colors",
        size === "sm" ? "text-xs" : "text-sm",
        clickable ? "cursor-pointer hover:opacity-80" : "cursor-default",
        className,
      )}
      style={{
        backgroundColor: `${trackColor}20`,
        color: trackColor,
        borderColor: `${trackColor}40`,
        border: "1px solid",
      }}
    >
      {showIcon && (
        <span className="mr-1 text-xs">
          {track.icon ?? <Route className="h-3 w-3" />}
        </span>
      )}
      <span className="truncate">{displayName}</span>
    </span>
  );

  if (!clickable) {
    return badgeContent;
  }

  return (
    <Link href={`/dashboard/tracks/${track.id}`} className="inline-block">
      {badgeContent}
    </Link>
  );
}
