import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const THUMBNAIL_BUCKET = process.env.SUPABASE_THUMBNAIL_BUCKET || "thumbnails";

type EntryRow = {
  entry_id: string;
  title: string;
  tags: string[] | null;
  topic: string | null;
  subscriber_count: number | null;
  created_at: string;
  thumbnail_path: string | null;
  feedback:
    | {
        score: number | null;
        thumbnail_feedback: string | null;
        title_feedback: string | null;
        tag_feedback: string[] | null;
      }
    | {
        score: number | null;
        thumbnail_feedback: string | null;
        title_feedback: string | null;
        tag_feedback: string[] | null;
      }[]
    | null;
};

type FeedbackSection = {
  headline: string;
  details: string;
  tips: [string, string, string];
};

function getScore(feedback: EntryRow["feedback"]): number | null {
  if (!feedback) {
    return null;
  }

  if (Array.isArray(feedback)) {
    return typeof feedback[0]?.score === "number" ? feedback[0].score : null;
  }

  return typeof feedback.score === "number" ? feedback.score : null;
}

function getFallbackSection(): FeedbackSection {
  return {
    headline: "No feedback available yet",
    details: "Run a new analysis to generate AI feedback for this section.",
    tips: [
      "Keep your topic clear and audience-specific.",
      "Align message across thumbnail, title, and tags.",
      "Test one improvement at a time.",
    ],
  };
}

function parseFeedbackSection(raw: string | null): FeedbackSection | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      headline?: unknown;
      details?: unknown;
      tips?: unknown;
    };
    if (
      typeof parsed.headline !== "string" ||
      typeof parsed.details !== "string" ||
      !Array.isArray(parsed.tips) ||
      parsed.tips.length !== 3 ||
      parsed.tips.some((tip) => typeof tip !== "string")
    ) {
      return null;
    }

    return {
      headline: parsed.headline.trim(),
      details: parsed.details.trim(),
      tips: [
        parsed.tips[0].trim(),
        parsed.tips[1].trim(),
        parsed.tips[2].trim(),
      ],
    };
  } catch {
    return null;
  }
}

function getFeedbackSections(feedback: EntryRow["feedback"]) {
  const fallback = getFallbackSection();
  if (!feedback) {
    return {
      thumbnail: fallback,
      title: fallback,
      tags: fallback,
    };
  }

  const row = Array.isArray(feedback) ? feedback[0] : feedback;
  const thumbnail = parseFeedbackSection(row?.thumbnail_feedback ?? null);
  const title = parseFeedbackSection(row?.title_feedback ?? null);
  const tagsSerialized =
    Array.isArray(row?.tag_feedback) && row.tag_feedback.length > 0
      ? row.tag_feedback[0]
      : null;
  const tags = parseFeedbackSection(tagsSerialized);

  return {
    thumbnail: thumbnail ?? fallback,
    title: title ?? fallback,
    tags: tags ?? fallback,
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to view recent analyses." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("entries")
    .select(
      "entry_id,title,tags,topic,subscriber_count,created_at,thumbnail_path,feedback(score,thumbnail_feedback,title_feedback,tag_feedback)"
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load recent analyses." },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as EntryRow[];
  const items = await Promise.all(
    rows.map(async (row) => {
      let thumbnailUrl: string | null = null;
      if (row.thumbnail_path) {
        const { data: signedData } = await supabase.storage
          .from(THUMBNAIL_BUCKET)
          .createSignedUrl(row.thumbnail_path, 60 * 60);
        thumbnailUrl = signedData?.signedUrl ?? null;
      }

      return {
        id: row.entry_id,
        title: row.title,
        tags: row.tags ?? [],
        topic: row.topic ?? "",
        subscriberCount: row.subscriber_count,
        createdAt: row.created_at,
        score: getScore(row.feedback),
        feedback: getFeedbackSections(row.feedback),
        thumbnailUrl,
      };
    })
  );

  return NextResponse.json({ items });
}
