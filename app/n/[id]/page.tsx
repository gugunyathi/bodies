import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { RichNotificationPayload } from "@/app/api/admin/notifications/rich/route";

interface Props {
  params: Promise<{ id: string }>;
}

async function getPayload(id: string): Promise<RichNotificationPayload | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/notifications/rich?id=${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const SECTION_ICONS: Record<string, string> = {
  swap: "🔄",
  token: "🪙",
  leaderboard: "🏆",
  profile: "👤",
  claim: "🎁",
  betting: "🎲",
  custom: "🔔",
};

const STYLE_CLASSES: Record<string, string> = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600",
  danger: "bg-red-600 hover:bg-red-500 text-white",
};

export default async function RichNotificationPage({ params }: Props) {
  const { id } = await params;
  const payload = await getPayload(id);
  if (!payload) notFound();

  const icon = payload.appSection ? SECTION_ICONS[payload.appSection] || "🔔" : "🔔";

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-lg">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors">
          ← Back to app
        </Link>

        <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
          {/* Hero image / GIF */}
          {payload.imageUrl && (
            <div className="relative w-full aspect-video bg-gray-800">
              {/* Use img for GIF support, Next Image for static URLs */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payload.imageUrl}
                alt="Notification media"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            {/* Section badge */}
            {payload.appSection && (
              <div className="inline-flex items-center gap-1.5 bg-blue-600/20 text-blue-300 text-xs font-medium px-3 py-1 rounded-full mb-4 capitalize">
                <span>{icon}</span>
                <span>{payload.appSection}</span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-2xl font-bold mb-3">{payload.title}</h1>

            {/* Short message */}
            <p className="text-gray-300 leading-relaxed mb-4">{payload.message}</p>

            {/* Long-form body */}
            {payload.body && (
              <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap border-t border-gray-800 pt-4 mb-4">
                {payload.body}
              </div>
            )}

            {/* Action buttons */}
            {payload.actions && payload.actions.length > 0 && (
              <div className="flex flex-col gap-3 mt-6">
                {payload.actions.map((action, i) => {
                  const cls = STYLE_CLASSES[action.style || "primary"];
                  const isExternal = action.url.startsWith("http");
                  return isExternal ? (
                    <a
                      key={i}
                      href={action.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${cls}`}
                    >
                      {action.label}
                      <span className="ml-1 opacity-60 text-xs">↗</span>
                    </a>
                  ) : (
                    <Link
                      key={i}
                      href={action.url}
                      className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${cls}`}
                    >
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-4 flex items-center justify-between text-xs text-gray-600">
            <span>Bodies App</span>
            <span>{new Date(payload.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
