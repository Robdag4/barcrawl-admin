import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Only apply CORS to organizer API routes
  if (!req.nextUrl.pathname.startsWith('/api/organizer')) {
    return NextResponse.next();
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'https://barcrawl.com',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Add CORS headers to response
  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', 'https://barcrawl.com');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export const config = {
  matcher: '/api/organizer/:path*',
};
