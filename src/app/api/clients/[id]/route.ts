import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/clients/[id]
 *
 * Get a single client by ID.
 * Only returns client if it belongs to the authenticated lawyer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: clientId } = await params;

    // Fetch client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        lawyerId: userId, // Ensure client belongs to this lawyer
      },
      include: {
        cases: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error(`[GET /api/clients/[id]] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch client', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients/[id]
 *
 * Update a client.
 * Only updates client if it belongs to the authenticated lawyer.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: clientId } = await params;
    const body = await request.json();

    // Check client exists and belongs to this lawyer
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        lawyerId: userId,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Validate email if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check if email is taken by another client
      if (body.email !== existingClient.email) {
        const emailTaken = await prisma.client.findFirst({
          where: {
            lawyerId: userId,
            email: body.email,
            id: { not: clientId },
          },
        });

        if (emailTaken) {
          return NextResponse.json(
            { error: 'Email already in use by another client' },
            { status: 409 }
          );
        }
      }
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        firstName: body.firstName || existingClient.firstName,
        lastName: body.lastName || existingClient.lastName,
        email: body.email || existingClient.email,
        contactEmail: body.email || existingClient.contactEmail,
        phone: body.phone !== undefined ? body.phone : existingClient.phone,
        contactAddress: body.contactAddress !== undefined ? body.contactAddress : existingClient.contactAddress,
      },
    });

    return NextResponse.json({ client: updatedClient });
  } catch (error: any) {
    console.error(`[PUT /api/clients/[id]] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to update client', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[id]
 *
 * Delete a client.
 * Only deletes client if it belongs to the authenticated lawyer.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id: clientId } = await params;

    // Check client exists and belongs to this lawyer
    const existingClient = await prisma.client.findFirst({
      where: {
        id: clientId,
        lawyerId: userId,
      },
      include: {
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if client has cases
    if (existingClient._count.cases > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete client with existing cases',
          caseCount: existingClient._count.cases,
        },
        { status: 409 }
      );
    }

    // Delete client
    await prisma.client.delete({
      where: { id: clientId },
    });

    return NextResponse.json({ success: true, message: 'Client deleted successfully' });
  } catch (error: any) {
    console.error(`[DELETE /api/clients/[id]] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete client', details: error.message },
      { status: 500 }
    );
  }
}
