import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export interface RichNotificationPayload {
  id: string;
  createdAt: string;
  // Content
  title: string;
  message: string;
  // Rich content
  imageUrl?: string;       // hero image or GIF
  body?: string;           // long-form markdown/text shown on landing page
  // Action buttons
  actions?: {
    label: string;
    url: string;           // can be internal path (/leaderboard) or external https://...
    style?: 'primary' | 'secondary' | 'danger';
  }[];
  // Meta
  appSection?: string;     // 'swap' | 'token' | 'leaderboard' | 'profile' | 'claim' | 'custom'
  expiresAt?: string;      // ISO date — hide landing page after this
}

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function key(id: string) {
  return `rich-notif:${id}`;
}

// POST /api/admin/notifications/rich — store rich payload, returns id + target_path
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = crypto.randomUUID();
    const payload: RichNotificationPayload = {
      id,
      createdAt: new Date().toISOString(),
      title: body.title,
      message: body.message,
      imageUrl: body.imageUrl || undefined,
      body: body.body || undefined,
      actions: body.actions || undefined,
      appSection: body.appSection || undefined,
      expiresAt: body.expiresAt || undefined,
    };

    if (redis) {
      await redis.set(key(id), JSON.stringify(payload), { ex: TTL_SECONDS });
    }

    return NextResponse.json({
      success: true,
      id,
      target_path: `/n/${id}`,
      payload,
    });
  } catch {
    return NextResponse.json({ error: "Failed to store" }, { status: 500 });
  }
}

// GET /api/admin/notifications/rich?id=<uuid>
export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (!redis) return NextResponse.json({ error: "No storage" }, { status: 503 });

  const raw = await redis.get<string>(key(id));
  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload: RichNotificationPayload = typeof raw === "string" ? JSON.parse(raw) : raw;

  // Check expiry
  if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  return NextResponse.json(payload);
}

// DELETE /api/admin/notifications/rich?id=<uuid>
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (redis) await redis.del(key(id));
  return NextResponse.json({ success: true });
}
