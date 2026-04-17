const BASE_API_URL = "https://dashboard.base.org/api/v1";
const appUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const apiKey = process.env.BASE_API_KEY || "";

export type SendNotificationResult =
  | { state: "success"; sentCount: number; failedCount: number }
  | { state: "error"; error: string }
  | { state: "no_api_key" };

/**
 * Send a notification to one or more wallet addresses via the Base Dashboard API.
 */
export async function sendFrameNotification({
  address,
  addresses,
  title,
  body,
  targetPath,
}: {
  address?: string;
  addresses?: string[];
  title: string;
  body: string;
  targetPath?: string;
}): Promise<SendNotificationResult> {
  if (!apiKey) return { state: "no_api_key" };

  const walletAddresses = addresses ?? (address ? [address] : []);
  if (!walletAddresses.length) return { state: "error", error: "No addresses provided" };

  const payload: Record<string, unknown> = {
    app_url: appUrl,
    wallet_addresses: walletAddresses,
    title: title.slice(0, 30),
    message: body.slice(0, 200),
  };
  if (targetPath) payload.target_path = targetPath;

  const response = await fetch(`${BASE_API_URL}/notifications/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await response.json();

  if (response.ok) {
    return { state: "success", sentCount: responseJson.sentCount ?? 0, failedCount: responseJson.failedCount ?? 0 };
  }

  return { state: "error", error: responseJson };
}
