"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
  className?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  credits?: number;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  badge?: string | number;
  isNew?: boolean;
}

export default function Sidebar({
  className = "",
  isMobileOpen = false,
  onMobileClose,
  credits = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projectCount] = useState(0); // TODO: Get from API
  const [processingCount] = useState(0); // TODO: Get from API

  // Smart navigation items focused on YouTube learning optimization
  const navigation: NavigationItem[] = [
    {
      name: "Overview",
      href: "/dashboard",
      description: "Dashboard overview and learning insights",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0"
          />
        </svg>
      ),
    },
    {
      name: "Projects",
      href: "/dashboard/projects",
      description: "Manage your video chunking projects",
      badge: projectCount > 0 ? projectCount : undefined,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      name: "Learning Lab",
      href: "/dashboard/learning",
      description: "AI-powered insights and knowledge extraction",
      isNew: true,
      icon: (
        <svg
          className="h-5 w-5"
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
      ),
    },
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      description: "Track engagement and learning outcomes",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      name: "Templates",
      href: "/dashboard/templates",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      name: "Shortcuts",
      href: "/dashboard/shortcuts",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Overlay - Simple */}
      {isMobileOpen && (
        <div
          className="bg-opacity-50 fixed inset-0 z-40 bg-black md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar - Simplified */}
      <div
        className={` ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} fixed top-0 left-0 z-50 w-72 md:relative md:z-auto md:translate-x-0 ${isCollapsed ? "md:w-16" : "md:w-72"} flex h-full flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out ${className} `}
      >
        {/* Header */}
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center ${isCollapsed ? "md:justify-center" : ""}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12c0 4.418-3.582 8-8 8a8.009 8.009 0 01-7.93-6.66c-.013-.447-.013-.895 0-1.34A8.009 8.009 0 0113 4c4.418 0 8 3.582 8 8z"
                  />
                </svg>
              </div>
              <div className={`ml-3 ${isCollapsed ? "md:hidden" : ""}`}>
                <h1 className="text-lg font-bold text-gray-900">Chunkwise</h1>
                <p className="-mt-0.5 text-xs text-gray-500">
                  Learning Accelerator
                </p>
              </div>
            </div>
            {/* Credits Badge */}
            <div className="ml-4 flex items-center">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                {credits} credits
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Mobile Close Button */}
              <button
                onClick={onMobileClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 md:hidden"
              >
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Desktop Collapse Button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden rounded-lg p-1.5 transition-colors hover:bg-gray-100 md:block"
              >
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="p-4">
          <Link
            href="/dashboard/new-project"
            onClick={onMobileClose} // Close on navigation
            className={`group relative flex w-full transform items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-blue-700 hover:to-purple-700 hover:shadow-xl ${isCollapsed ? "md:px-3" : ""}`}
          >
            <svg
              className="mr-2 h-5 w-5"
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
            <span className={isCollapsed ? "md:hidden" : ""}>New Project</span>

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full z-50 ml-2 hidden rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 md:block">
                New Project
              </div>
            )}
          </Link>
        </div>

        {/* Processing Status Banner */}
        {processingCount > 0 && (
          <div
            className={`mx-4 mb-4 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-3 ${isCollapsed ? "md:hidden" : ""}`}
          >
            <div className="flex items-center">
              <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-green-800">
                {processingCount} project{processingCount > 1 ? "s" : ""}{" "}
                processing
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onMobileClose} // Close on navigation
                  className={`group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "border-r-2 border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  } ${isCollapsed ? "md:justify-center" : ""}`}
                >
                  <span
                    className={`flex-shrink-0 ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
                  >
                    {item.icon}
                  </span>

                  <div
                    className={`ml-3 flex flex-1 items-center justify-between ${isCollapsed ? "md:hidden" : ""}`}
                  >
                    <span>{item.name}</span>

                    {/* Badges and indicators */}
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                          {item.badge}
                        </span>
                      )}
                      {item.isNew && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full z-50 ml-2 hidden rounded-lg bg-gray-900 px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 md:block">
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-0.5 text-xs text-gray-300">
                        {item.description}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className={`mt-8 ${isCollapsed ? "md:hidden" : ""}`}>
            <div className="mb-3 px-3">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Quick Actions
              </h3>
            </div>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  onClick={onMobileClose} // Close on navigation
                  className="group flex items-center rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <span className="mr-3 text-gray-400 group-hover:text-gray-600">
                    {action.icon}
                  </span>
                  {action.name}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4">
          <div className={isCollapsed ? "md:hidden" : ""}>
            <div className="space-y-3">
              {/* Learning Progress */}
              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">
                    Learning Streak
                  </span>
                  <span className="text-sm font-bold text-purple-600">
                    7 days
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-purple-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{ width: "70%" }}
                  ></div>
                </div>
                <p className="mt-1 text-xs text-purple-700">
                  3 more days to beat your record!
                </p>
              </div>

              {/* Storage */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Storage used</span>
                <span>2.3 GB / 100 GB</span>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-200">
                <div
                  className="h-1 rounded-full bg-blue-500"
                  style={{ width: "2.3%" }}
                ></div>
              </div>
            </div>
          </div>

          {/* Collapsed footer */}
          {isCollapsed && (
            <div className="hidden justify-center md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-xs font-bold text-white">7</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
