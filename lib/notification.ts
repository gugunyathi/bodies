import { redis } from "./redis";

// Standard web notification details (replaces Farcaster MiniAppNotificationDetails)
export type NotificationDetails = {
  url: string;
  token: string;
};

const notificationServiceKey =
  process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ?? "minikit";

function getUserNotificationDetailsKey(address: string): string {
  return `${notificationServiceKey}:user:${address.toLowerCase()}`;
}

export async function getUserNotificationDetails(
  address: string,
): Promise<NotificationDetails | null> {
  if (!redis) {
    return null;
  }

  return await redis.get<NotificationDetails>(
    getUserNotificationDetailsKey(address),
  );
}

export async function setUserNotificationDetails(
  address: string,
  notificationDetails: NotificationDetails,
): Promise<void> {
  if (!redis) {
    return;
  }

  await redis.set(getUserNotificationDetailsKey(address), notificationDetails);
}

export async function deleteUserNotificationDetails(
  address: string,
): Promise<void> {
  if (!redis) {
    return;
  }

  await redis.del(getUserNotificationDetailsKey(address));
}
