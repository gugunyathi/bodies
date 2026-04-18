// Webhook endpoint — returns 410 Gone (Farcaster frame integration removed).
export async function POST(_request: Request) {
  return new Response(null, { status: 410 });
}

