import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware to protect admin routes
 *
 * Redirects unauthenticated users to login page.
 * Only allows ADMIN role users to access admin routes.
 */
export async function middleware(request: NextRequest) {
  // Get the token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check if user is authenticated
  if (!token) {
    // Redirect to login with callback URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user is admin
  if (token.role !== 'ADMIN') {
    // Non-admin users get redirected to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // User is authenticated and is admin, allow access
  return NextResponse.next();
}

/**
 * Match admin routes and API routes that require authentication
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/code/:path*',
    '/api/promotion/:path*',
  ],
};
