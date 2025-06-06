import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Flame,
  FlaskConical,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  PlusCircle,
  Video,
  FileText,
} from "lucide-react";

interface NewSidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const NewSidebar = ({ isCollapsed, toggleSidebar }: NewSidebarProps) => {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Projects", href: "/dashboard/projects", icon: Package },
    { name: "Streak", href: "/dashboard/streak", icon: Flame },
    { name: "Learning Lab", href: "/dashboard/learning", icon: FlaskConical },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <aside
      className={`relative hidden h-screen bg-gray-900 text-white transition-all duration-300 ease-in-out md:flex md:flex-col ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between p-4">
        {!isCollapsed && <span className="text-xl font-bold">YourApp</span>}
        <button
          onClick={toggleSidebar}
          className="rounded-full p-2 hover:bg-gray-800"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      <nav className="flex-grow p-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.name} className="mb-2">
              <Link
                href={item.href}
                className={`flex items-center rounded-lg p-3 hover:bg-gray-800 ${
                  pathname === item.href ? "bg-gray-700" : ""
                }`}
              >
                <item.icon className="h-6 w-6" />
                {!isCollapsed && <span className="ml-4">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4">
        {/* Streak Tracker */}
        <div className="mb-4 rounded-lg bg-gray-800 p-3">
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${isCollapsed ? "hidden" : ""}`}>
              Streak
            </span>
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          {!isCollapsed && (
            <div className="mt-2 text-center">
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-gray-400">days</p>
            </div>
          )}
        </div>

        {/* Storage Indicator */}
        <div className="mb-4 rounded-lg bg-gray-800 p-3">
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${isCollapsed ? "hidden" : ""}`}>
              Storage
            </span>
            <Package className="h-5 w-5 text-blue-400" />
          </div>
          {!isCollapsed && (
            <>
              <div className="relative mt-2 h-2 rounded-full bg-gray-700">
                <div
                  className="absolute h-2 rounded-full bg-blue-500"
                  style={{ width: "45%" }}
                ></div>
              </div>
              <p className="mt-1 text-xs text-gray-400">4.5GB / 10GB</p>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center">
          <UserCircle className="h-10 w-10" />
          {!isCollapsed && (
            <div className="ml-3">
              <p className="font-semibold">User Name</p>
              <p className="text-sm text-gray-400">user@email.com</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default NewSidebar;
