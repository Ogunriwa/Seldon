import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function extractHostname(hostHeader: string): string {
  const trimmed = hostHeader.trim().toLowerCase();
  if (trimmed.startsWith('[')) {
    const closeIdx = trimmed.indexOf(']');
    return closeIdx !== -1 ? trimmed.slice(0, closeIdx + 1) : trimmed;
  }
  return trimmed.split(':')[0] ?? '';
}

function isAllowedLocalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Root Security Proxy (Next.js 16 convention): Localhost CSRF, Origin & DNS Rebinding Guard
 *
 * Protects Seldon's local API endpoints from being triggered or abused by
 * external web pages visited by the user in the same browser.
 *
 * Mechanisms:
 * 1. Host allowlist (DNS Rebinding defense): Every /api/* request (including GET)
 *    must carry a Host header resolving to localhost, 127.0.0.1, or [::1].
 * 2. Sec-Fetch-Site: Reject 'cross-site' on all API routes, and reject anything
 *    other than 'same-origin' / 'none' on state-modifying requests.
 * 3. Origin & Referer validation: On state-modifying requests (POST, PATCH, DELETE, PUT),
 *    validate Origin (and Referer if Origin is absent) against the localhost allowlist.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply protection to API route handlers
  if (pathname.startsWith('/api/')) {
    const hostHeader = req.headers.get('host');
    const secFetchSite = req.headers.get('sec-fetch-site');
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const isMutating = ['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method);

    // 1. Host header validation (blocks DNS rebinding on both GET and mutating requests)
    if (hostHeader) {
      const hostName = extractHostname(hostHeader);
      if (!ALLOWED_LOCAL_HOSTS.has(hostName)) {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden: Untrusted Host header.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // 2. Cross-site request blocking via Fetch Metadata
    if (secFetchSite === 'cross-site' || (isMutating && secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none')) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Cross-site requests are strictly prohibited.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 3. Origin & Referer validation for state-modifying requests
    if (isMutating) {
      if (origin !== null) {
        if (!isAllowedLocalUrl(origin)) {
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden: Untrusted or invalid request origin.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
          );
        }
      } else if (referer !== null && !isAllowedLocalUrl(referer)) {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden: Untrusted request referer.' }),
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
