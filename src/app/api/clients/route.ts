import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/clients
 *
 * List all clients for the authenticated lawyer.
 * Supports search query parameter.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {
      lawyerId: userId,
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch clients
    const clients = await prisma.client.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('[GET /api/clients] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 *
 * Create a new client for the authenticated lawyer.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    // Validate required fields
    const { firstName, lastName, email, phone, contactAddress } = body;
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists for this lawyer
    const existingClient = await prisma.client.findFirst({
      where: {
        lawyerId: userId,
        email: email,
      },
    });

    if (existingClient) {
      return NextResponse.json(
        { error: 'Client with this email already exists' },
        { status: 409 }
      );
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        email,
        contactEmail: email, // Use same email for contact
        phone: phone || null,
        contactAddress: contactAddress || null,
        lawyerId: userId,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/clients] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create client', details: error.message },
      { status: 500 }
    );
  }
}
