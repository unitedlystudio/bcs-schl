import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';
import { getToken } from '@convex-dev/better-auth/utils';
import { fetchAction, fetchMutation, fetchQuery, preloadQuery } from 'convex/nextjs';
import type { FunctionReference, FunctionReturnType } from 'convex/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import { requirePublicAuthConfig } from '@/lib/auth-server-config';
import { createSafeTokenReader } from '@/lib/auth-server-headers';

type BaseAuthServer = ReturnType<typeof convexBetterAuthNextJs>;
let authServer: BaseAuthServer | undefined;

export function getAuthServer(): BaseAuthServer {
  if (authServer) return authServer;
  const { convexUrl, convexSiteUrl } = requirePublicAuthConfig();
  const base = convexBetterAuthNextJs({ convexUrl, convexSiteUrl });
  const safeGetToken = cache(
    createSafeTokenReader(
      async () => new Headers(await headers()),
      async (sanitized) => (await getToken(convexSiteUrl, sanitized)).token
    )
  );
  const callWithToken = async <T>(fn: (token?: string) => Promise<T>): Promise<T> =>
    fn(await safeGetToken());

  authServer = {
    ...base,
    getToken: safeGetToken,
    isAuthenticated: async () => Boolean(await safeGetToken()),
    preloadAuthQuery: async <Query extends FunctionReference<'query'>>(
      query: Query,
      ...args: Parameters<BaseAuthServer['preloadAuthQuery']> extends [unknown, ...infer Rest]
        ? Rest
        : never
    ) => callWithToken((token) => preloadQuery(query, args[0] ?? {}, { token }) as never),
    fetchAuthQuery: async <Query extends FunctionReference<'query'>>(
      query: Query,
      ...args: Parameters<BaseAuthServer['fetchAuthQuery']> extends [unknown, ...infer Rest]
        ? Rest
        : never
    ): Promise<FunctionReturnType<Query>> =>
      callWithToken((token) => fetchQuery(query, args[0] ?? {}, { token }) as never),
    fetchAuthMutation: async <Mutation extends FunctionReference<'mutation'>>(
      mutation: Mutation,
      ...args: Parameters<BaseAuthServer['fetchAuthMutation']> extends [unknown, ...infer Rest]
        ? Rest
        : never
    ): Promise<FunctionReturnType<Mutation>> =>
      callWithToken((token) => fetchMutation(mutation, args[0] ?? {}, { token }) as never),
    fetchAuthAction: async <Action extends FunctionReference<'action'>>(
      action: Action,
      ...args: Parameters<BaseAuthServer['fetchAuthAction']> extends [unknown, ...infer Rest]
        ? Rest
        : never
    ): Promise<FunctionReturnType<Action>> =>
      callWithToken((token) => fetchAction(action, args[0] ?? {}, { token }) as never)
  };
  return authServer;
}
