"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Plus,
  Home,
  BookOpen,
  Bookmark,
  PlayCircle,
  Sparkles,
  Clock,
  ChevronLeft,
  ChevronRight,
  Command,
  Zap,
  TrendingUp,
  History,
  Star,
  ArrowRight,
  Pause,
  MoreHorizontal,
  Tags,
} from "lucide-react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

interface FocusBarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isSmartCollapseEnabled: boolean;
  onToggleSmartCollapse: (enabled: boolean) => void;
}

// Mock data
const recentActivity = [
  {
    id: 1,
    title: "Neural Networks Intro",
    progress: 65,
    time: "2h ago",
    type: "video",
  },
  {
    id: 2,
    title: "React Hooks Deep Dive",
    progress: 100,
    time: "Yesterday",
    type: "video",
  },
  {
    id: 3,
    title: "Algorithm Analysis",
    progress: 30,
    time: "3 days ago",
    type: "pdf",
  },
];

const quickActions = [
  {
    id: 1,
    label: "Resume Learning",
    icon: PlayCircle,
    action: "resume",
    color: "text-green-600",
  },
  {
    id: 2,
    label: "Quick Add",
    icon: Plus,
    action: "add",
    color: "text-blue-600",
  },
  {
    id: 3,
    label: "View Progress",
    icon: TrendingUp,
    action: "progress",
    color: "text-purple-600",
  },
];

export default function FocusBar({
  isCollapsed,
  onToggleCollapse,
}: FocusBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Current learning session
  const [isLearning, setIsLearning] = useState(true);
  const [sessionTime, setSessionTime] = useState("45:23");

  // Command palette handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Focus command input when opened
  useEffect(() => {
    if (commandOpen) {
      commandInputRef.current?.focus();
    }
  }, [commandOpen]);

  const navItems = [
    { icon: Home, label: "Home", href: "/dashboard", shortcut: "H" },
    {
      icon: BookOpen,
      label: "Library",
      href: "/dashboard/library",
      shortcut: "L",
    },
    {
      icon: Bookmark,
      label: "Bookmarks",
      href: "/dashboard/bookmarks",
      shortcut: "B",
    },
    {
      icon: History,
      label: "History",
      href: "/dashboard/history",
      shortcut: "Y",
    },
  ];

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "resume":
        router.push("/dashboard/projects/current");
        break;
      case "add":
        router.push("/dashboard/new-project");
        break;
      case "progress":
        router.push("/dashboard/analytics");
        break;
    }
  };

  return (
    <>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300",
          isCollapsed ? "w-[68px]" : "w-[280px]",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-gray-50 bg-green-500" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">Focus</h1>
                <p className="text-xs text-gray-500">Learning mode</p>
              </div>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="rounded-md p-1.5 transition-colors hover:bg-gray-100"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Command Bar Trigger */}
        <div className="border-b border-gray-200 p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCommandOpen(true)}
                className={cn(
                  "flex w-full items-center space-x-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-all hover:border-gray-300",
                  isCollapsed && "justify-center px-2",
                )}
              >
                <Search className="h-4 w-4 text-gray-400" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left text-sm text-gray-500">
                      Quick search...
                    </span>
                    <kbd className="hidden h-5 items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600 select-none sm:inline-flex">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </>
                )}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>Quick search (⌘K)</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Current Session */}
        {!isCollapsed && isLearning && (
          <div className="mx-3 mt-3 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 p-3 text-white">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium opacity-90">
                Current Session
              </span>
              <button
                onClick={() => setIsLearning(!isLearning)}
                className="rounded p-1 transition-colors hover:bg-white/20"
              >
                <Pause className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Neural Networks</p>
                <p className="text-xs opacity-75">Chunk 5 of 12</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold">{sessionTime}</p>
                <p className="text-xs opacity-75">elapsed</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-white"
                style={{ width: "42%" }}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const navLink = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 transition-all",
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100",
                    isCollapsed && "justify-center px-2",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-white" : "text-gray-500",
                    )}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-sm font-medium">
                        {item.label}
                      </span>
                      {!isActive && (
                        <kbd className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 lg:inline-block">
                          {item.shortcut}
                        </kbd>
                      )}
                    </>
                  )}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return navLink;
            })}
          </div>

          {/* Quick Actions */}
          {!isCollapsed && (
            <div className="mt-6">
              <h3 className="px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Quick Actions
              </h3>
              <div className="mt-3 space-y-1">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.action)}
                    className="group flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-gray-100"
                  >
                    <action.icon className={cn("h-4 w-4", action.color)} />
                    <span className="flex-1 text-left text-sm">
                      {action.label}
                    </span>
                    <ArrowRight className="h-3 w-3 -translate-x-2 text-gray-400 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {!isCollapsed && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between px-3">
                <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Recent
                </h3>
                <button className="text-xs text-gray-400 hover:text-gray-600">
                  View all
                </button>
              </div>
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/projects/${item.id}`}
                    className="group block rounded-lg px-3 py-2 transition-all hover:bg-gray-100"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-gray-900">
                        {item.title}
                      </p>
                      <span className="text-xs text-gray-500">{item.time}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-1 flex-1 rounded-full bg-gray-200">
                        <div
                          className="h-1 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.progress}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          {/* Stats */}
          {!isCollapsed && (
            <div className="mb-3 flex items-center justify-around py-2">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">12</p>
                <p className="text-xs text-gray-500">day streak</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">4.5h</p>
                <p className="text-xs text-gray-500">this week</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">89%</p>
                <p className="text-xs text-gray-500">complete</p>
              </div>
            </div>
          )}

          {/* User */}
          <div
            className={cn(
              "flex items-center",
              isCollapsed ? "justify-center" : "space-x-3 px-2",
            )}
          >
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-xs text-white">
                      {session?.user?.email?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Profile Settings</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-xs text-white">
                    {session?.user?.email?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {session?.user?.name ?? "Learner"}
                  </p>
                  <p className="text-xs text-gray-500">Pro Plan</p>
                </div>
                <button className="rounded p-1 transition-colors hover:bg-gray-100">
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Command Palette */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setCommandOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed top-1/2 left-1/2 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2">
            <div
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Command Input */}
              <div className="flex items-center border-b border-gray-200 px-4">
                <Command className="h-5 w-5 text-gray-400" />
                <input
                  ref={commandInputRef}
                  type="text"
                  placeholder="Type a command or search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-4 text-lg outline-none"
                />
                <kbd className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  ESC
                </kbd>
              </div>

              {/* Command Results */}
              <div className="max-h-96 overflow-y-auto p-2">
                {/* Quick Actions */}
                <div className="mb-4">
                  <p className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </p>
                  <div className="space-y-1">
                    <button className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100">
                      <div className="rounded bg-green-100 p-1">
                        <PlayCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Resume Learning
                        </p>
                        <p className="text-xs text-gray-500">
                          Continue where you left off
                        </p>
                      </div>
                      <kbd className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        ⌘R
                      </kbd>
                    </button>
                    <button className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100">
                      <div className="rounded bg-blue-100 p-1">
                        <Zap className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Quick Add
                        </p>
                        <p className="text-xs text-gray-500">Add new content</p>
                      </div>
                      <kbd className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        ⌘N
                      </kbd>
                    </button>
                  </div>
                </div>

                {/* Recent Items */}
                <div>
                  <p className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                    Recent
                  </p>
                  <div className="space-y-1">
                    {recentActivity.map((item) => (
                      <button
                        key={item.id}
                        className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100"
                      >
                        <Star className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            {item.type} • {item.time}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
