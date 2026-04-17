import { sendFrameNotification } from "@/lib/notification-client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, addresses, notification } = body;

    if (!notification?.title || !notification?.body) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

    const result = await sendFrameNotification({
      address,
      addresses,
      title: notification.title,
      body: notification.body,
      targetPath: notification.targetPath,
    });

    if (result.state === "no_api_key") {
      return NextResponse.json({ error: "Notifications not configured" }, { status: 503 });
    }

    if (result.state === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, sentCount: result.sentCount, failedCount: result.failedCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
