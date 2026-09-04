import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
  if (request.nextUrl.pathname === '/auth/sign-up') {
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}

export const config = { matcher: ['/dashboard/:path*', '/api/:path*', '/auth/sign-up'] };
