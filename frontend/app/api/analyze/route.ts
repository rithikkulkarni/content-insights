import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function getGroup(subscribers: number): number {
  if (subscribers >= 0 && subscribers < 1_000) return 1;
  if (subscribers >= 1_000 && subscribers < 10_000) return 2;
  if (subscribers >= 10_000 && subscribers < 50_000) return 3;
  if (subscribers >= 50_000 && subscribers < 250_000) return 4;
  if (subscribers >= 250_000 && subscribers < 1_000_000) return 5;
  if (subscribers >= 1_000_000) return 6;
  return 1;
}

function toScore(probability: number): number {
  const clamped = Math.min(1, Math.max(0, probability));
  return Math.round(clamped * 100);
}

function toTagArray(tags: string): string[] {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getFileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName) {
    return fromName;
  }

  const fromType = file.type.split("/").pop()?.trim().toLowerCase();
  if (fromType === "jpeg") {
    return "jpg";
  }

  return fromType || "png";
}

async function deleteEntry(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  entryId: string
) {
  await supabase.from("entries").delete().eq("entry_id", entryId);
}

function logSupabaseError(context: string, error: unknown) {
  console.error(`[analyze] ${context}`, error);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to analyze content." },
      { status: 401 }
    );
  }

  const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL;
  const thumbnailBucket = process.env.SUPABASE_THUMBNAIL_BUCKET || "thumbnails";
  if (!pythonApiBaseUrl) {
    return NextResponse.json(
      { error: "PYTHON_API_BASE_URL is not configured." },
      { status: 500 }
    );
  }

  const inbound = await request.formData();
  const title = String(inbound.get("title") ?? "").trim();
  const tags = String(inbound.get("tags") ?? "").trim();
  const topic = String(inbound.get("topic") ?? "").trim();
  const subscriberCountRaw = String(inbound.get("subscriberCount") ?? "0");
  const thumbnail = inbound.get("thumbnail");

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!(thumbnail instanceof File)) {
    return NextResponse.json(
      { error: "Thumbnail image is required." },
      { status: 400 }
    );
  }

  const subscriberCount = Number.parseInt(subscriberCountRaw, 10);
  const group = getGroup(
    Number.isFinite(subscriberCount) ? Math.max(0, subscriberCount) : 0
  );

  const outbound = new FormData();
  outbound.append("title", title);
  outbound.append("tags", tags);
  outbound.append("thumbnail", thumbnail, thumbnail.name || "thumbnail.png");

  const baseUrl = pythonApiBaseUrl.endsWith("/")
    ? pythonApiBaseUrl.slice(0, -1)
    : pythonApiBaseUrl;
  const endpoint = `${baseUrl}/predict/group${group}`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(endpoint, {
      method: "POST",
      body: outbound,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach prediction API." },
      { status: 502 }
    );
  }

  let upstreamBody: unknown;
  try {
    upstreamBody = await upstreamResponse.json();
  } catch {
    return NextResponse.json(
      { error: "Prediction API returned invalid JSON." },
      { status: 502 }
    );
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { error: "Prediction API request failed." },
      { status: 502 }
    );
  }

  const payload = upstreamBody as {
    probability?: unknown;
    score?: unknown;
  };
  const probabilityValue =
    typeof payload.probability === "number"
      ? payload.probability
      : typeof payload.score === "number"
        ? payload.score
        : NaN;

  if (!Number.isFinite(probabilityValue)) {
    return NextResponse.json(
      { error: "Prediction API response is missing a numeric score." },
      { status: 502 }
    );
  }

  const probability = Math.min(1, Math.max(0, probabilityValue));
  const score = toScore(probability);
  const normalizedSubscriberCount = Number.isFinite(subscriberCount)
    ? Math.max(0, subscriberCount)
    : null;

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      user_id: user.id,
      thumbnail_path: null,
      title,
      tags: toTagArray(tags),
      topic: topic || null,
      subscriber_count: normalizedSubscriberCount,
    })
    .select("entry_id")
    .single();

  if (entryError || !entry) {
    logSupabaseError("entry insert failed", entryError);
    return NextResponse.json(
      { error: "Analysis completed, but saving the entry failed." },
      { status: 500 }
    );
  }

  const thumbnailPath = `${user.id}/${entry.entry_id}/thumbnail.${getFileExtension(thumbnail)}`;
  const { error: thumbnailUploadError } = await supabase.storage
    .from(thumbnailBucket)
    .upload(thumbnailPath, thumbnail, {
      cacheControl: "3600",
      contentType: thumbnail.type || "image/png",
      upsert: false,
    });

  if (thumbnailUploadError) {
    logSupabaseError("thumbnail upload failed", thumbnailUploadError);
    await deleteEntry(supabase, entry.entry_id);
    return NextResponse.json(
      { error: "Analysis completed, but uploading the thumbnail failed." },
      { status: 500 }
    );
  }

  const { error: entryUpdateError } = await supabase
    .from("entries")
    .update({ thumbnail_path: thumbnailPath })
    .eq("entry_id", entry.entry_id);

  if (entryUpdateError) {
    logSupabaseError("entry thumbnail_path update failed", entryUpdateError);
    await supabase.storage.from(thumbnailBucket).remove([thumbnailPath]);
    await deleteEntry(supabase, entry.entry_id);
    return NextResponse.json(
      { error: "Analysis completed, but saving the thumbnail path failed." },
      { status: 500 }
    );
  }

  const { data: feedback, error: feedbackError } = await supabase
    .from("feedback")
    .insert({
      entry_id: entry.entry_id,
      score,
    })
    .select("feedback_id")
    .single();

  if (feedbackError || !feedback) {
    logSupabaseError("feedback insert failed", feedbackError);
    await supabase.storage.from(thumbnailBucket).remove([thumbnailPath]);
    await deleteEntry(supabase, entry.entry_id);
    return NextResponse.json(
      { error: "Analysis completed, but saving the feedback failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    probability,
    score,
    entryId: entry.entry_id,
    feedbackId: feedback.feedback_id,
  });
}
