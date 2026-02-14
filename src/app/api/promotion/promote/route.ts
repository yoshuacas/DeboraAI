import { NextRequest, NextResponse } from 'next/server';
import { createPromotionManager } from '@/lib/promotion/promotion-manager';

/**
 * POST /api/promotion/promote
 *
 * Promote staging changes to production.
 * This is a CRITICAL operation that deploys code to the live environment.
 *
 * Safety checks performed:
 * - All staging tests must pass
 * - No uncommitted changes
 * - Production branch is clean
 * - There are changes to promote
 *
 * Request body:
 * {
 *   "performedBy": "admin@example.com",  // Required
 *   "message": "Optional promotion message"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Successfully promoted staging to production",
 *   "changes": {
 *     "filesChanged": 5,
 *     "insertions": 120,
 *     "deletions": 30,
 *     "commits": 3
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { performedBy, message } = body;

    if (!performedBy || typeof performedBy !== 'string') {
      return NextResponse.json(
        { error: 'performedBy is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('='.repeat(80));
    console.log('PROMOTION REQUEST');
    console.log('='.repeat(80));
    console.log(`Performed by: ${performedBy}`);
    if (message) {
      console.log(`Message: ${message}`);
    }
    console.log('-'.repeat(80));

    const promotionManager = createPromotionManager();

    // Perform promotion
    const result = await promotionManager.promote({
      performedBy,
      message,
    });

    if (!result.success) {
      console.error('Promotion failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.error,
        },
        { status: 400 }
      );
    }

    console.log('✓ Promotion successful');
    console.log('='.repeat(80));

    return NextResponse.json({
      success: true,
      message: result.message,
      changes: result.changes,
    });
  } catch (error) {
    console.error('Promotion request failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
