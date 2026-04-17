import { NextResponse } from "next/server";

const BASE_API_URL = "https://dashboard.base.org/api/v1";
const appUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const apiKey = process.env.BASE_API_KEY || "";

export async function GET(request: Request) {
  if (!apiKey) {
    return NextResponse.json({ error: "Notifications not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = searchParams.get("limit") ?? "100";

  const params = new URLSearchParams({
    app_url: appUrl,
    notification_enabled: "true",
    limit,
    ...(cursor ? { cursor } : {}),
  });

  const response = await fetch(`${BASE_API_URL}/notifications/app/users?${params}`, {
    headers: { "x-api-key": apiKey },
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: data }, { status: response.status });
  }

  return NextResponse.json(data, { status: 200 });
}
