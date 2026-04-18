import "./theme.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { cookieToInitialState } from 'wagmi';
import { config } from '../lib/wagmi';
import { headers } from 'next/headers';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Bodies",
    description: "Rate relationships · Track scores · Keep it real",
    other: {
      "base:app_id": "69e251143bb010cd08cfdb83",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookie = headersList.get('cookie');
  const initialState = cookieToInitialState(config, cookie);

  return (
    <html lang="en">
      <body className="bg-background">
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
