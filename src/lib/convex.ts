import { ConvexReactClient } from 'convex/react';

let convexClient: ConvexReactClient | null = null;

export function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!url) {
    return null;
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(url);
  }

  return convexClient;
}
