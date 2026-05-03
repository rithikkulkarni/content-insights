import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabaseServer", () => ({
  createSupabaseServerClient,
}));

import { POST } from "@/api/analyze/route";

type SupabaseMock = ReturnType<typeof createSupabaseMock>;

function createSupabaseMock(options?: {
  userId?: string | null;
  entryInsertResult?: { data: { entry_id: string } | null; error: unknown };
  feedbackInsertResult?: {
    data: { feedback_id: string } | null;
    error: unknown;
  };
  thumbnailUploadResult?: { data?: unknown; error: unknown };
  entryUpdateResult?: { error: unknown };
  entryDeleteResult?: { error: unknown };
  storageRemoveResult?: { data?: unknown; error: unknown };
}) {
  const userId = options?.userId === undefined ? "user-123" : options.userId;
  const entryInsertSingle = vi.fn().mockResolvedValue(
    options?.entryInsertResult ?? {
      data: { entry_id: "entry-123" },
      error: null,
    }
  );
  const feedbackInsertSingle = vi.fn().mockResolvedValue(
    options?.feedbackInsertResult ?? {
      data: { feedback_id: "feedback-123" },
      error: null,
    }
  );
  const entriesInsertSelect = vi
    .fn()
    .mockReturnValue({ single: entryInsertSingle });
  const feedbackInsertSelect = vi
    .fn()
    .mockReturnValue({ single: feedbackInsertSingle });
  const entriesInsert = vi
    .fn()
    .mockReturnValue({ select: entriesInsertSelect });
  const feedbackInsert = vi
    .fn()
    .mockReturnValue({ select: feedbackInsertSelect });
  const entriesUpdateEq = vi
    .fn()
    .mockResolvedValue(options?.entryUpdateResult ?? { error: null });
  const entriesDeleteEq = vi
    .fn()
    .mockResolvedValue(options?.entryDeleteResult ?? { error: null });
  const entriesUpdate = vi.fn().mockReturnValue({ eq: entriesUpdateEq });
  const entriesDelete = vi.fn().mockReturnValue({ eq: entriesDeleteEq });
  const storageUpload = vi.fn().mockResolvedValue(
    options?.thumbnailUploadResult ?? {
      data: { path: "unused" },
      error: null,
    }
  );
  const storageRemove = vi
    .fn()
    .mockResolvedValue(
      options?.storageRemoveResult ?? { data: [], error: null }
    );
  const storageFrom = vi.fn().mockReturnValue({
    upload: storageUpload,
    remove: storageRemove,
  });
  const entriesTable = {
    insert: entriesInsert,
    update: entriesUpdate,
    delete: entriesDelete,
  };
  const feedbackTable = {
    insert: feedbackInsert,
  };
  const from = vi.fn((table: string) => {
    if (table === "entries") {
      return entriesTable;
    }
    if (table === "feedback") {
      return feedbackTable;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: userId ? { id: userId } : null,
        },
      }),
    },
    from,
    storage: {
      from: storageFrom,
    },
    spies: {
      entriesInsert,
      entriesInsertSelect,
      entryInsertSingle,
      entriesUpdate,
      entriesUpdateEq,
      entriesDelete,
      entriesDeleteEq,
      feedbackInsert,
      feedbackInsertSelect,
      feedbackInsertSingle,
      storageFrom,
      storageUpload,
      storageRemove,
    },
  };
}

function buildAnalyzeRequest() {
  const formData = new FormData();
  formData.append("title", "Title for analysis");
  formData.append("tags", "tag one, tag two");
  formData.append("topic", "Education");
  formData.append("subscriberCount", "5200");
  formData.append(
    "thumbnail",
    new File(["image-bytes"], "thumbnail.png", { type: "image/png" })
  );

  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

describe("POST /api/analyze", () => {
  let supabase: SupabaseMock;
  const geminiFeedback = {
    thumbnail: {
      headline: "Boost contrast and focal clarity",
      details:
        "Your thumbnail concept is clear, but stronger hierarchy can improve first-glance readability.",
      tips: [
        "Increase text contrast over the background.",
        "Emphasize one facial or object focal point.",
        "Reduce competing visual elements.",
      ],
    },
    title: {
      headline: "Strong concept, sharper hook needed",
      details:
        "The title communicates intent, but it could promise a clearer viewer outcome.",
      tips: [
        "Lead with a specific transformation benefit.",
        "Use one urgency or emotion word.",
        "Trim filler to tighten pacing.",
      ],
    },
    tags: {
      headline: "Expand long-tail keyword intent",
      details:
        "Your tag set is relevant, but adding more intent-rich long-tail variants can improve discovery.",
      tips: [
        "Add niche-specific search phrase variants.",
        "Mirror core title keywords in tags.",
        "Include audience intent terms.",
      ],
    },
  };

  beforeEach(() => {
    process.env.PYTHON_API_BASE_URL = "https://python.example";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    delete process.env.SUPABASE_THUMBNAIL_BUCKET;

    supabase = createSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ probability: 0.81 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify(geminiFeedback) }],
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        )
    );
  });

  it("persists the entry, uploads the thumbnail, and creates feedback", async () => {
    const response = await POST(buildAnalyzeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://python.example/predict/group2",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-test-key"
      ),
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      })
    );
    expect(supabase.spies.entriesInsert).toHaveBeenCalledWith({
      user_id: "user-123",
      thumbnail_path: null,
      title: "Title for analysis",
      tags: ["tag one", "tag two"],
      topic: "Education",
      subscriber_count: 5200,
    });
    expect(supabase.spies.storageFrom).toHaveBeenCalledWith("thumbnails");
    expect(supabase.spies.storageUpload).toHaveBeenCalledWith(
      "user-123/entry-123/thumbnail.png",
      expect.any(File),
      expect.objectContaining({
        contentType: "image/png",
        upsert: false,
      })
    );
    expect(supabase.spies.entriesUpdate).toHaveBeenCalledWith({
      thumbnail_path: "user-123/entry-123/thumbnail.png",
    });
    expect(supabase.spies.entriesUpdateEq).toHaveBeenCalledWith(
      "entry_id",
      "entry-123"
    );
    expect(supabase.spies.feedbackInsert).toHaveBeenCalledWith({
      entry_id: "entry-123",
      score: 81,
      thumbnail_feedback: JSON.stringify(geminiFeedback.thumbnail),
      title_feedback: JSON.stringify(geminiFeedback.title),
      tag_feedback: [JSON.stringify(geminiFeedback.tags)],
    });
    expect(body).toEqual({
      probability: 0.81,
      score: 81,
      entryId: "entry-123",
      feedbackId: "feedback-123",
      feedback: geminiFeedback,
    });
  });

  it("deletes the entry when thumbnail upload fails", async () => {
    supabase = createSupabaseMock({
      thumbnailUploadResult: {
        error: { message: "Bucket not found" },
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await POST(buildAnalyzeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Analysis completed, but uploading the thumbnail failed.",
    });
    expect(supabase.spies.entriesDelete).toHaveBeenCalled();
    expect(supabase.spies.entriesDeleteEq).toHaveBeenCalledWith(
      "entry_id",
      "entry-123"
    );
    expect(supabase.spies.feedbackInsert).not.toHaveBeenCalled();
    expect(supabase.spies.storageRemove).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is not authenticated", async () => {
    supabase = createSupabaseMock({ userId: null });
    createSupabaseServerClient.mockResolvedValue(supabase);

    const response = await POST(buildAnalyzeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: "You must be signed in to analyze content.",
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(supabase.spies.entriesInsert).not.toHaveBeenCalled();
  });
});
