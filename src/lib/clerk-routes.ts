export const SCHLY_POST_AUTH_REDIRECT = '/dashboard/workspaces/team';

export const clerkRouteConfig = {
  signInUrl: '/auth/sign-in',
  signUpUrl: '/auth/sign-up',
  signInFallbackRedirectUrl: SCHLY_POST_AUTH_REDIRECT,
  signUpFallbackRedirectUrl: SCHLY_POST_AUTH_REDIRECT,
  signUpForceRedirectUrl: SCHLY_POST_AUTH_REDIRECT
} as const;
