"use client";

import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

export default function DebugPage() {
  const { data: session, status } = useSession();

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Debug Page</h1>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Session Status: {status}</h2>

        {session && (
          <div className="rounded bg-gray-100 p-4">
            <h3 className="font-semibold">Session Data:</h3>
            <pre className="mt-2 text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="font-semibold">Dropdown Test:</h3>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Test Dropdown
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {session?.user?.name ?? "User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => alert("Profile clicked")}
                className="cursor-pointer"
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ redirectTo: "/login" })}
                className="text-destructive cursor-pointer"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Direct Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
