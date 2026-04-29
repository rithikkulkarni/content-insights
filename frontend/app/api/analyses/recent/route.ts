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
  feedback: { score: number | null } | { score: number | null }[] | null;
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
      "entry_id,title,tags,topic,subscriber_count,created_at,thumbnail_path,feedback(score)"
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
        thumbnailUrl,
      };
    })
  );

  return NextResponse.json({ items });
}
