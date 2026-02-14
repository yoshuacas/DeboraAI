import { NextRequest, NextResponse } from 'next/server';
import { createPromotionManager } from '@/lib/promotion/promotion-manager';

/**
 * GET /api/promotion/history
 *
 * Get promotion history showing what has been deployed to production.
 * Returns commits from the main (production) branch, highlighting promotions.
 *
 * Query params:
 * - limit: Number of commits to return (default: 20)
 *
 * Response:
 * {
 *   "success": true,
 *   "history": [
 *     {
 *       "hash": "abc123",
 *       "message": "Promote staging to production",
 *       "author": "admin",
 *       "date": "2026-02-14T...",
 *       "isPromotion": true
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`Getting promotion history (limit: ${limit})...`);

    const promotionManager = createPromotionManager();

    // Get promotion history
    const history = await promotionManager.getHistory(limit);

    console.log(`Retrieved ${history.length} commit(s)`);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Failed to get promotion history:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get promotion history',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
