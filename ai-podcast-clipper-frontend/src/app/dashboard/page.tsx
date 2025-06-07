"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getDashboardData,
  type ProjectWithStats,
  type DashboardStats,
} from "~/actions/projects";
import { useRealTimeStatus } from "~/hooks/use-real-time-status";
import { RealTimeProjectCard } from "~/components/real-time-project-card";

export default function DashboardPage() {
  const [recentProjects, setRecentProjects] = useState<ProjectWithStats[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    completedChunks: 0,
    totalWatchTime: "0m",
    learningStreak: 0,
    inProgressProjects: 0,
    completedProjects: 0,
    processingProjects: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { recentProjects: projects, stats: dashboardStats } =
          await getDashboardData();
        setRecentProjects(projects);
        setStats(dashboardStats);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  const getStatusBadge = (status: string, progressPercentage: number) => {
    if (status === "processed" || progressPercentage === 100) {
      return "bg-green-100 text-green-800";
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return "bg-blue-100 text-blue-800";
    } else if (status === "queued") {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-gray-100 text-gray-800";
    }
  };

  const getProcessingStatusLabel = (
    status: string,
    progressPercentage: number,
  ) => {
    if (status === "processed" || progressPercentage === 100) {
      return "Ready";
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return "Processing";
    } else if (status === "queued") {
      return "Queued";
    } else {
      return "Pending";
    }
  };

  if (error) {
    return (
      <div className="space-y-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="mb-2 text-2xl font-bold text-red-800">
            Error Loading Dashboard
          </h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <h1 className="mb-2 text-2xl font-bold">
          Welcome back to Chunkwise! 👋
        </h1>
        <p className="text-blue-100">
          Break down YouTube videos into digestible learning chunks. Continue
          your learning journey.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            <div className="rounded-lg bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : stats.totalProjects}
              </p>
              <p className="text-gray-500">Total Projects</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            <div className="rounded-lg bg-green-100 p-3">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : stats.completedChunks}
              </p>
              <p className="text-gray-500">Completed Chunks</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            <div className="rounded-lg bg-purple-100 p-3">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : stats.totalWatchTime}
              </p>
              <p className="text-gray-500">Watch Time</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center">
            <div className="rounded-lg bg-orange-100 p-3">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : stats.learningStreak}
              </p>
              <p className="text-gray-500">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          href="/dashboard/new-project"
          className="transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white transition-all hover:scale-105 hover:from-blue-700 hover:to-purple-700"
        >
          <div className="flex items-center">
            <svg
              className="mr-4 h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold">New Project</h3>
              <p className="text-blue-100">Import YouTube video</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/projects"
          className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center">
            <svg
              className="mr-4 h-8 w-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                View Projects
              </h3>
              <p className="text-gray-500">Manage all projects</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/learning"
          className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center">
            <svg
              className="mr-4 h-8 w-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Learning Lab
              </h3>
              <p className="text-gray-500">AI insights & notes</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Projects */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Projects
            </h2>
            <Link
              href="/dashboard/projects"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                      <div className="flex items-center space-x-4">
                        <div className="h-3 w-16 rounded bg-gray-200"></div>
                        <div className="h-3 w-16 rounded bg-gray-200"></div>
                        <div className="h-3 w-20 rounded bg-gray-200"></div>
                      </div>
                      <div className="mt-3">
                        <div className="h-2 w-full rounded bg-gray-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="py-8 text-center">
              <svg
                className="mx-auto mb-4 h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No projects yet
              </h3>
              <p className="mb-4 text-gray-500">
                Get started by creating your first YouTube learning project
              </p>
              <Link
                href="/dashboard/new-project"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Create Project
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <RealTimeProjectCard
                  key={project.id}
                  project={project}
                  onStatusUpdate={(projectId, newStatus) => {
                    // Update the project in our local state
                    setRecentProjects((prev) =>
                      prev.map((p) =>
                        p.id === projectId ? { ...p, status: newStatus } : p,
                      ),
                    );

                    // Update stats when status changes
                    if (newStatus === "processed") {
                      setStats((prev) => ({
                        ...prev,
                        completedProjects: prev.completedProjects + 1,
                        processingProjects: Math.max(
                          0,
                          prev.processingProjects - 1,
                        ),
                      }));
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
