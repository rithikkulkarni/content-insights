import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type FeedbackSection = {
  headline: string;
  details: string;
  tips: [string, string, string];
};

type UnifiedFeedback = {
  thumbnail: FeedbackSection;
  title: FeedbackSection;
  tags: FeedbackSection;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

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

function sanitizePromptValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getFallbackFeedback(): UnifiedFeedback {
  return {
    thumbnail: {
      headline: "Improve visual hierarchy and contrast",
      details:
        "Your thumbnail communicates the topic, but stronger contrast and a clearer focal point can make it easier to read at a glance.",
      tips: [
        "Increase contrast between subject and background.",
        "Use larger, bolder text with fewer words.",
        "Place one focal element near the visual center.",
      ],
    },
    title: {
      headline: "Clear concept, but sharpen the hook",
      details:
        "The title explains the idea, but a more specific benefit and stronger emotional framing could increase click motivation.",
      tips: [
        "Lead with the biggest promised viewer benefit.",
        "Use one strong emotion or urgency word.",
        "Trim filler words to improve scan speed.",
      ],
    },
    tags: {
      headline: "Add specificity and long-tail intent",
      details:
        "Your tags are relevant, but adding more intent-driven long-tail phrases can improve discoverability for your target audience.",
      tips: [
        "Include 2-3 long-tail search phrase variations.",
        "Match tags closely to title keywords.",
        "Add audience and niche intent terms.",
      ],
    },
  };
}

function buildUnifiedFeedbackPrompt(input: {
  title: string;
  tags: string;
  niche: string;
  subscribers: number;
}): string {
  return [
    "Role: YouTube content strategist.",
    "",
    "Input:",
    `title="${sanitizePromptValue(input.title)}"`,
    `tags="${sanitizePromptValue(input.tags || "none")}"`,
    `niche="${sanitizePromptValue(input.niche)}"`,
    `subscribers=${input.subscribers}`,
    "thumbnail=<attached image>",
    "",
    "Task:",
    "Evaluate the thumbnail, title, and tags for appeal, clarity, niche fit, and likely viewer reaction.",
    "",
    "Output JSON only:",
    '{"thumbnail":{"headline":"","details":"","tips":["","",""]},"title":{"headline":"","details":"","tips":["","",""]},"tags":{"headline":"","details":"","tips":["","",""]}}',
    "",
    "Constraints:",
    "Each headline: one sentence, <=12 words.",
    "Each details: 1-3 sentences, <=75 words.",
    "Each tips: exactly 3 one-line improvement tips, <=14 words each.",
    "No rewritten titles. No markdown. No extra keys.",
  ].join("\n");
}

function parseFeedbackSection(value: unknown): FeedbackSection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const section = value as {
    headline?: unknown;
    details?: unknown;
    tips?: unknown;
  };
  if (
    typeof section.headline !== "string" ||
    typeof section.details !== "string" ||
    !Array.isArray(section.tips) ||
    section.tips.length !== 3 ||
    section.tips.some((tip) => typeof tip !== "string")
  ) {
    return null;
  }

  return {
    headline: section.headline.trim(),
    details: section.details.trim(),
    tips: [
      section.tips[0].trim(),
      section.tips[1].trim(),
      section.tips[2].trim(),
    ],
  };
}

function parseUnifiedFeedback(payload: string): UnifiedFeedback | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const root = parsed as {
    thumbnail?: unknown;
    title?: unknown;
    tags?: unknown;
  };
  const thumbnail = parseFeedbackSection(root.thumbnail);
  const title = parseFeedbackSection(root.title);
  const tags = parseFeedbackSection(root.tags);
  if (!thumbnail || !title || !tags) {
    return null;
  }

  return { thumbnail, title, tags };
}

function getGeminiText(response: GeminiResponse): string | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  return text || null;
}

async function generateUnifiedFeedback(input: {
  geminiApiKey: string;
  title: string;
  tags: string;
  niche: string;
  subscribers: number;
  thumbnail: File;
}): Promise<UnifiedFeedback> {
  const prompt = buildUnifiedFeedbackPrompt({
    title: input.title,
    tags: input.tags,
    niche: input.niche,
    subscribers: input.subscribers,
  });
  const imageBytes = await input.thumbnail.arrayBuffer();
  const imageBase64 = Buffer.from(imageBytes).toString("base64");

  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_URL}?key=${input.geminiApiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: input.thumbnail.type || "image/png",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      }),
      cache: "no-store",
    });
  } catch {
    return getFallbackFeedback();
  }

  if (!response.ok) {
    return getFallbackFeedback();
  }

  let responseBody: GeminiResponse;
  try {
    responseBody = (await response.json()) as GeminiResponse;
  } catch {
    return getFallbackFeedback();
  }

  const geminiText = getGeminiText(responseBody);
  if (!geminiText) {
    return getFallbackFeedback();
  }

  const parsed = parseUnifiedFeedback(geminiText);
  return parsed ?? getFallbackFeedback();
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
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const thumbnailBucket = process.env.SUPABASE_THUMBNAIL_BUCKET || "thumbnails";
  if (!pythonApiBaseUrl) {
    return NextResponse.json(
      { error: "PYTHON_API_BASE_URL is not configured." },
      { status: 500 }
    );
  }
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
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
  const unifiedFeedback = await generateUnifiedFeedback({
    geminiApiKey,
    title,
    tags,
    niche: topic || "general",
    subscribers: normalizedSubscriberCount ?? 0,
    thumbnail,
  });

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
      thumbnail_feedback: JSON.stringify(unifiedFeedback.thumbnail),
      title_feedback: JSON.stringify(unifiedFeedback.title),
      tag_feedback: [JSON.stringify(unifiedFeedback.tags)],
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
    feedback: unifiedFeedback,
  });
}
