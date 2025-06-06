"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FocusBar from "./FocusBar";

interface NewDashboardLayoutProps {
  children: React.ReactNode;
}

const NewDashboardLayout = ({ children }: NewDashboardLayoutProps) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSmartCollapseEnabled, setSmartCollapseEnabled] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Auto-collapse sidebar when consuming content (videos, clips, etc.)
  useEffect(() => {
    if (!isSmartCollapseEnabled) return;

    const isContentPage =
      pathname?.includes("/clips/") ||
      pathname?.includes("/video/") ||
      pathname?.includes("/player/");

    if (isContentPage && !isSidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [pathname, isSmartCollapseEnabled, isSidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <FocusBar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          isSmartCollapseEnabled={isSmartCollapseEnabled}
          onToggleSmartCollapse={setSmartCollapseEnabled}
        />
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-[280px] bg-white shadow-lg">
            <FocusBar
              isCollapsed={false}
              onToggleCollapse={toggleMobileMenu}
              isSmartCollapseEnabled={false}
              onToggleSmartCollapse={() => {
                // No-op for mobile - smart collapse is disabled
              }}
            />
          </div>
          <div className="flex-1 bg-black/50" onClick={toggleMobileMenu}></div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMobileMenu}
              className="rounded-md p-2 transition-colors hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <span className="text-lg font-semibold">AI Podcast Clipper</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default NewDashboardLayout;
