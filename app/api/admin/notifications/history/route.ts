import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const HISTORY_KEY = "admin:notifications:history";
const MAX_HISTORY = 100;

export interface NotificationRecord {
  id: string;
  sentAt: string;
  title: string;
  body: string;
  targetPath?: string;
  recipients: string[];
  sentCount: number;
  failedCount: number;
  broadcast: boolean;
}

async function getHistory(): Promise<NotificationRecord[]> {
  if (!redis) return [];
  const raw = await redis.get<NotificationRecord[]>(HISTORY_KEY);
  return raw || [];
}

async function saveHistory(history: NotificationRecord[]) {
  if (!redis) return;
  await redis.set(HISTORY_KEY, history.slice(0, MAX_HISTORY));
}

// GET /api/admin/notifications/history
export async function GET() {
  const history = await getHistory();
  return NextResponse.json({ history });
}

// POST /api/admin/notifications/history — record a sent notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const record: NotificationRecord = {
      id: crypto.randomUUID(),
      sentAt: new Date().toISOString(),
      title: body.title,
      body: body.body,
      targetPath: body.targetPath,
      recipients: body.recipients || [],
      sentCount: body.sentCount ?? 0,
      failedCount: body.failedCount ?? 0,
      broadcast: body.broadcast ?? false,
    };

    const history = await getHistory();
    history.unshift(record); // newest first
    await saveHistory(history);

    return NextResponse.json({ success: true, record });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// DELETE /api/admin/notifications/history?id=<uuid>
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const history = await getHistory();
  await saveHistory(history.filter(h => h.id !== id));

  return NextResponse.json({ success: true });
}
