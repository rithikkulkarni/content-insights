import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  const pythonApiBaseUrl = process.env.PYTHON_API_BASE_URL;
  if (!pythonApiBaseUrl) {
    return NextResponse.json(
      { error: "PYTHON_API_BASE_URL is not configured." },
      { status: 500 }
    );
  }

  const inbound = await request.formData();
  const title = String(inbound.get("title") ?? "").trim();
  const tags = String(inbound.get("tags") ?? "").trim();
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
  return NextResponse.json({
    probability,
    score: toScore(probability),
  });
}
