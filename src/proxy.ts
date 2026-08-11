import {NextResponse, type NextRequest} from 'next/server';

// The publishing plugin validates custom-framework webhooks by POSTing the bare domain.
// Homepage GET requests continue to use the existing optional catch-all page route.
export function proxy(request: NextRequest) {
  if (request.method === 'POST' && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/api/webhook/send_article', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/']
};
