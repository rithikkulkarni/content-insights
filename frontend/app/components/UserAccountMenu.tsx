"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, History, LogOut, Settings, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useRouteNavigator } from "@/lib/routeState";

type UserAccountMenuProps = {
  user: SupabaseUser;
};

function getDisplayName(user: SupabaseUser): string {
  const metadata = user.user_metadata;
  const fullName =
    typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
  if (fullName) {
    return fullName;
  }

  if (user.email) {
    return user.email;
  }

  return "Account";
}

function getInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function UserAccountMenu({ user }: UserAccountMenuProps) {
  const navigate = useRouteNavigator();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = getDisplayName(user);
  const displayEmail = user.email ?? "";

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setOpen(false);
    setSigningOut(false);
    navigate("/");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
          {getInitials(displayName)}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-30">
          <div className="px-4 pb-2 mb-1 border-b border-gray-100">
            <p className="text-sm text-gray-900 font-medium truncate">{displayName}</p>
            {displayEmail && (
              <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
            )}
          </div>

          <button
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <User className="w-4 h-4 text-gray-400" />
            Profile
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <Settings className="w-4 h-4 text-gray-400" />
            Settings
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => {
              setOpen(false);
              navigate("/results");
            }}
          >
            <History className="w-4 h-4 text-gray-400" />
            Analyzed Videos
          </button>

          <div className="border-t border-gray-100 my-1" />

          <button
            disabled={signingOut}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60 cursor-pointer"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="w-4 h-4" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
