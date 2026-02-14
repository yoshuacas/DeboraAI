import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Middleware to protect admin routes
 *
 * Redirects unauthenticated users to login page.
 * Only allows ADMIN role users to access admin routes.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Check if user is admin
    if (token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

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
