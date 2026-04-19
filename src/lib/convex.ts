import { ConvexReactClient } from 'convex/react';

let convexClient: ConvexReactClient | null = null;

export function getConvexClient() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }

  return convexClient;
}
