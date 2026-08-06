import {NextResponse, type NextRequest} from 'next/server';

// The plugin validates custom-framework webhooks by POSTing the bare domain.
// Keep homepage GET requests on the existing optional catch-all page route.
export function proxy(request: NextRequest) {
  if (request.method === 'POST' && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/api/webhook/send_article', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/']
};
