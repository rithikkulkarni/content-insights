// app/test-supabase-button.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";

export default function TestSupabaseButton() {
  async function handleClick() {
    const { data, error } = await supabase
      .from("test_items")
      .insert([{ title: "hello from next app" }])
      .select();

    console.log("data:", data);
    console.log("error:", error);

    if (error) {
      alert(`Insert failed: ${error.message}`);
    } else {
      alert("Insert worked!");
    }
  }

  return (
    <button
      onClick={handleClick}
      className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
    >
      Test Supabase Insert
    </button>
  );
}
