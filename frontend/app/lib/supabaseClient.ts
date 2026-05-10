"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let browserClient: SupabaseClient | undefined;

function clearMalformedCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const cookiePairs = document.cookie.split(";");
  cookiePairs.forEach((pair) => {
    const [rawName] = pair.trim().split("=");
    const name = rawName?.trim();
    if (!name) {
      return;
    }

    if (!name.includes("[object")) {
      return;
    }

    document.cookie = `${name}=; path=/; max-age=0`;
  });
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    clearMalformedCookies();
    browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey);
  }

  return browserClient;
}

export const supabase = getSupabaseBrowserClient();
