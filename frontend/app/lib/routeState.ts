"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "__content_insights_route_state_v1__";

type RouteStateStore = Record<string, unknown>;
type NavigateOptions = {
  state?: unknown;
};

function normalizePath(path: string): string {
  const [pathname] = path.split("?");
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function readStore(): RouteStateStore {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as RouteStateStore;
  } catch {
    return {};
  }
}

function writeStore(store: RouteStateStore): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function setRouteState(path: string, state: unknown): void {
  const routePath = normalizePath(path);
  const store = readStore();
  store[routePath] = state;
  writeStore(store);
}

function getRouteState<T>(path: string): T | undefined {
  const routePath = normalizePath(path);
  const store = readStore();
  return store[routePath] as T | undefined;
}

export function useRouteNavigator() {
  const router = useRouter();

  return (href: string, options?: NavigateOptions) => {
    if (options && "state" in options) {
      setRouteState(href, options.state);
    }

    router.push(href);
  };
}

export function useRouteState<T = unknown>(): T | undefined {
  const pathname = usePathname();

  return useMemo(() => {
    if (!pathname) {
      return undefined;
    }

    return getRouteState<T>(pathname);
  }, [pathname]);
}
