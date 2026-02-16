import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware to protect authenticated routes
 *
 * Redirects unauthenticated users to login page.
 * - Admin routes (/admin/*) require ADMIN role
 * - Lawyer routes (/dashboard, /clientes, etc.) require LAWYER or ADMIN role
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  // Check role-based access
  const userRole = token.role as string;

  // Admin routes - only ADMIN role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Lawyer routes - LAWYER or ADMIN role
  const lawyerRoutes = [
    '/dashboard',
    '/clientes',
    '/casos',
    '/documentos',
    '/chat',
    '/biblioteca',
    '/plantillas',
    '/calendario',
  ];

  const isLawyerRoute = lawyerRoutes.some(route => pathname.startsWith(route));
  if (isLawyerRoute) {
    if (userRole !== 'LAWYER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // User is authenticated with correct role, allow access
  return NextResponse.next();
}

/**
 * Match protected routes
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/code/:path*',
    '/api/promotion/:path*',
    '/dashboard/:path*',
    '/clientes/:path*',
    '/casos/:path*',
    '/documentos/:path*',
    '/chat/:path*',
    '/biblioteca/:path*',
    '/plantillas/:path*',
    '/calendario/:path*',
  ],
};
