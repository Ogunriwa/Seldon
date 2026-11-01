import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Root Security Proxy (Next.js 16 convention): Localhost CSRF & Origin Guard
 *
 * Protects Seldon's local API endpoints from being triggered or abused by
 * external web pages visited by the user in the same browser.
 *
 * Mechanisms:
 * 1. Sec-Fetch-Site: If the browser tags the request as 'cross-site', reject with 403.
 * 2. Origin validation: On state-modifying requests (POST, PATCH, DELETE, PUT),
 *    ensure Origin matches localhost or 127.0.0.1.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply protection to API route handlers
  if (pathname.startsWith('/api/')) {
    const secFetchSite = req.headers.get('sec-fetch-site');
    const origin = req.headers.get('origin');

    // 1. Cross-site request blocking via Fetch Metadata
    // Modern browsers (Chrome, Edge, Safari 16.4+, Firefox) automatically attach
    // sec-fetch-site. A cross-site website cannot forge this header.
    if (secFetchSite === 'cross-site') {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Cross-site requests are strictly prohibited.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 2. Origin validation for state-modifying requests
    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method) && origin) {
      try {
        const originUrl = new URL(origin);
        const isLocal =
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1' ||
          originUrl.hostname === '[::1]';

        if (!isLocal) {
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden: Untrusted request origin.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
          );
        }
      } catch {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden: Invalid request origin.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
