"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Route,
  Play,
  Clock,
  Users,
  Trophy,
  ChevronRight,
  Zap,
  Star,
  BookOpen,
  Target,
  Plus,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { motion } from "framer-motion";

interface TracksViewProps {
  layoutType: "grid" | "list";
  searchQuery: string;
}

// Mock data for tracks (this would come from a hook/API in real implementation)
const mockTracks = [
  {
    id: "1",
    title: "Complete Web Development",
    description:
      "Master modern web development from HTML/CSS to advanced React and Next.js",
    progress: 65,
    totalProjects: 12,
    completedProjects: 8,
    totalDuration: "48h 30m",
    difficulty: "intermediate",
    enrolled: 2341,
    rating: 4.8,
    tags: ["React", "Next.js", "TypeScript", "Tailwind"],
    thumbnail: "/api/placeholder/400/300",
    instructor: "Sarah Johnson",
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "2",
    title: "Machine Learning Fundamentals",
    description:
      "Learn ML basics, neural networks, and practical implementations with Python",
    progress: 30,
    totalProjects: 8,
    completedProjects: 2,
    totalDuration: "36h 15m",
    difficulty: "advanced",
    enrolled: 1892,
    rating: 4.9,
    tags: ["Python", "TensorFlow", "Neural Networks", "Data Science"],
    thumbnail: "/api/placeholder/400/300",
    instructor: "Dr. Michael Chen",
    lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "3",
    title: "UI/UX Design Masterclass",
    description:
      "Design beautiful, user-friendly interfaces from wireframes to high-fidelity prototypes",
    progress: 0,
    totalProjects: 15,
    completedProjects: 0,
    totalDuration: "42h 00m",
    difficulty: "beginner",
    enrolled: 3567,
    rating: 4.7,
    tags: ["Figma", "Design Systems", "User Research", "Prototyping"],
    thumbnail: "/api/placeholder/400/300",
    instructor: "Emma Davis",
    lastAccessed: null,
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800";
    case "intermediate":
      return "bg-yellow-100 text-yellow-800";
    case "advanced":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function TracksView({
  layoutType,
  searchQuery,
}: TracksViewProps) {
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);

  // Filter tracks based on search query
  const filteredTracks = mockTracks.filter((track) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.description.toLowerCase().includes(query) ||
      track.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  if (filteredTracks.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 p-6">
            <Route className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {searchQuery ? "No tracks found" : "No learning tracks yet"}
          </h3>
          <p className="mt-2 text-gray-500">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Create your first learning track to organize your educational journey"}
          </p>
          {!searchQuery && (
            <button className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Track
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid Layout
  if (layoutType === "grid") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {filteredTracks.map((track, index) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.2,
              delay: index * 0.03,
              ease: [0.4, 0, 0.2, 1],
            }}
            onMouseEnter={() => setHoveredTrack(track.id)}
            onMouseLeave={() => setHoveredTrack(null)}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-xl"
          >
            {/* Header Image */}
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 sm:h-48">
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Route className="h-12 w-12 text-white/80 sm:h-16 sm:w-16" />
              </div>
              {track.progress > 0 && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16">
                    <svg
                      className="h-14 w-14 -rotate-90 transform sm:h-16 sm:w-16"
                      viewBox="0 0 56 56"
                    >
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        fill="none"
                        className="text-white/20"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - track.progress / 100)}`}
                        className="text-white transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white sm:text-sm">
                        {track.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium sm:px-2.5",
                    getDifficultyColor(track.difficulty),
                  )}
                >
                  {track.difficulty}
                </span>
                <div className="flex items-center text-xs text-gray-500 sm:text-sm">
                  <Star className="mr-1 h-3.5 w-3.5 fill-yellow-400 text-yellow-400 sm:h-4 sm:w-4" />
                  <span>{track.rating}</span>
                </div>
              </div>

              <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-900 sm:text-lg">
                {track.title}
              </h3>
              <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                {track.description}
              </p>

              {/* Tags - Mobile optimized */}
              <div className="mb-4 flex flex-wrap gap-1">
                {track.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
                {track.tags.length > 2 && (
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    +{track.tags.length - 2}
                  </span>
                )}
              </div>

              {/* Stats - Mobile optimized */}
              <div className="mb-4 grid grid-cols-3 gap-1 text-center sm:gap-2">
                <div>
                  <div className="text-base font-semibold text-gray-900 sm:text-lg">
                    {track.totalProjects}
                  </div>
                  <div className="text-xs text-gray-500">Projects</div>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900 sm:text-lg">
                    {track.totalDuration}
                  </div>
                  <div className="text-xs text-gray-500">Duration</div>
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900 sm:text-lg">
                    {(track.enrolled / 1000).toFixed(1)}k
                  </div>
                  <div className="text-xs text-gray-500">Enrolled</div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/dashboard/tracks/${track.id}`}
                className={cn(
                  "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-all sm:px-4",
                  track.progress > 0
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200",
                )}
              >
                {track.progress > 0 ? (
                  <>
                    Continue Learning
                    <ChevronRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </>
                ) : (
                  <>
                    Start Track
                    <Zap className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </>
                )}
              </Link>

              {/* Instructor - Mobile optimized */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span className="truncate">by {track.instructor}</span>
                {track.lastAccessed && (
                  <span className="flex-shrink-0">
                    {track.lastAccessed.toLocaleDateString() ===
                    new Date().toLocaleDateString()
                      ? `Today`
                      : track.lastAccessed.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // List Layout - Mobile optimized
  return (
    <div className="space-y-3 sm:space-y-4">
      {filteredTracks.map((track, index) => (
        <motion.div
          key={track.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.2,
            delay: index * 0.03,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="group relative rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-md sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Progress Circle - Mobile optimized */}
            <div className="relative flex-shrink-0">
              <div className="relative mx-auto h-16 w-16 sm:h-20 sm:w-20">
                <svg
                  className="h-16 w-16 -rotate-90 transform sm:h-20 sm:w-20"
                  viewBox="0 0 64 64"
                >
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - track.progress / 100)}`}
                    className="text-blue-600 transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-bold text-gray-900 sm:text-lg">
                    {track.progress}%
                  </span>
                </div>
              </div>
            </div>

            {/* Content - Mobile optimized */}
            <div className="flex-1">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 sm:text-xl">
                    {track.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600 sm:text-base">
                    {track.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                      getDifficultyColor(track.difficulty),
                    )}
                  >
                    {track.difficulty}
                  </span>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{track.rating}</span>
                  </div>
                </div>
              </div>

              {/* Tags - Mobile optimized */}
              <div className="mb-3 flex flex-wrap gap-1.5 sm:gap-2">
                {track.tags.map((tag, i) => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 sm:px-2.5 sm:text-sm",
                      i >= 3 && "hidden sm:inline-flex",
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Stats and Actions - Mobile optimized */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-500 sm:flex sm:items-center sm:gap-6">
                  <span className="flex items-center">
                    <BookOpen className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {track.completedProjects}/{track.totalProjects} projects
                  </span>
                  <span className="flex items-center">
                    <Clock className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {track.totalDuration}
                  </span>
                  <span className="col-span-2 flex items-center sm:col-span-1">
                    <Users className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {(track.enrolled / 1000).toFixed(1)}k enrolled
                  </span>
                </div>

                <Link
                  href={`/dashboard/tracks/${track.id}`}
                  className={cn(
                    "inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-all sm:w-auto",
                    track.progress > 0
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200",
                  )}
                >
                  {track.progress > 0 ? "Continue" : "Start"} Track
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>

              {/* Instructor info - Mobile */}
              <div className="mt-3 text-xs text-gray-500 sm:hidden">
                by {track.instructor}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
