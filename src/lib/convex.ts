import { ConvexReactClient } from 'convex/react';

let convexClient: ConvexReactClient | null = null;
let cachedConvexUrl: string | null = null;

function normalizeConvexUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

export function getConvexClient() {
  const rawUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!rawUrl) {
    return null;
  }

  const url = normalizeConvexUrl(rawUrl);

  if (!convexClient || cachedConvexUrl !== url) {
    convexClient = new ConvexReactClient(url);
    cachedConvexUrl = url;
  }

  return convexClient;
}
