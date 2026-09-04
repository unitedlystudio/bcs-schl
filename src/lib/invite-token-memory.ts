const INVITE_TOKEN_KEY = '__SCHLY_INVITE_TOKEN__' as const;

declare global {
  interface Window {
    __SCHLY_INVITE_TOKEN__?: string;
  }
}

export function captureInviteToken(): string | null {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('invite');
  if (token) window[INVITE_TOKEN_KEY] = token;
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  return window[INVITE_TOKEN_KEY] ?? null;
}

export function getInviteToken(): string | null {
  return window[INVITE_TOKEN_KEY] ?? null;
}

export function clearInviteToken(): void {
  delete window[INVITE_TOKEN_KEY];
}

export function isCompletedInviteClaim(status: string): boolean {
  return status === 'accepted' || status === 'already_accepted';
}

/**
 * Retries within the current SPA lifetime only. A full reload intentionally discards the secret.
 */
export async function retryInviteClaim(
  token: string,
  claim: (args: { token: string }) => Promise<{ status: string }>
): Promise<boolean> {
  const result = await claim({ token });
  const completed = isCompletedInviteClaim(result.status);
  if (completed) clearInviteToken();
  return completed;
}
