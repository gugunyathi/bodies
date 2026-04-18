// Farcaster frame manifest is no longer used — this app is a standard mobile web app.
export async function GET() {
  return new Response(null, { status: 410 });
}
