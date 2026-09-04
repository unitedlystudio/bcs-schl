import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import authConfig from './auth.config';
import { digestInviteToken, normalizeEmail, requireAbsoluteOrigin } from './lib/authPolicy';

export const authComponent = createClient<DataModel>(components.betterAuth);

function requiredSecret(name: 'BETTER_AUTH_SECRET' | 'INVITE_TOKEN_SECRET'): string {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  return value;
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = requireAbsoluteOrigin(process.env.SITE_URL, 'SITE_URL');
  return betterAuth({
    appName: 'Schly',
    baseURL: siteUrl,
    basePath: '/api/auth',
    trustedOrigins: [siteUrl],
    secret: requiredSecret('BETTER_AUTH_SECRET'),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: true
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    hooks: {
      before: createAuthMiddleware(async (request) => {
        if (request.path !== '/sign-up/email') return;
        const email = normalizeEmail(request.body.email);
        const token = request.headers?.get('x-schly-invite-token') ?? '';
        const digest = token
          ? await digestInviteToken(token, requiredSecret('INVITE_TOKEN_SECRET'))
          : '';
        const allowed = await ctx.runQuery(internal.invites.validateSignup, {
          email,
          tokenDigest: digest
        });
        if (!allowed) throw new APIError('FORBIDDEN', { message: 'SIGNUP_NOT_ALLOWED' });
      })
    },
    plugins: [convex({ authConfig })]
  });
};

export const { getAuthUser } = authComponent.clientApi();
