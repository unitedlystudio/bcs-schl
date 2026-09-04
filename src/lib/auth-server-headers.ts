export function authCookieHeaders(incoming: Headers): Headers {
  const sanitized = new Headers();
  const cookie = incoming.get('cookie');
  if (cookie) sanitized.set('cookie', cookie);
  return sanitized;
}

export function createSafeTokenReader(
  readHeaders: () => Promise<Headers>,
  readToken: (headers: Headers) => Promise<string | undefined>
) {
  return async () => readToken(authCookieHeaders(await readHeaders()));
}
