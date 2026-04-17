// Farcaster frame webhook — no longer used in the Base App after April 9 2026.
// Neynar FID-based add/remove events and the Key Registry verification on Optimism
// are deprecated. Wallet-address notifications via the Base.dev notifications API
// are coming soon (https://docs.base.org/apps/quickstart/migrate-to-standard-web-app).
// This route returns 410 Gone so any lingering webhook deliveries fail fast.

export async function POST(_request: Request) {
  return Response.json(
    {
      success: false,
      error:
        "Farcaster frame webhook is no longer supported. " +
        "Notifications will migrate to the Base.dev wallet-address notifications API.",
    },
    { status: 410 },
  );
}

