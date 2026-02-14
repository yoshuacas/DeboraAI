import { NextRequest, NextResponse } from 'next/server';
import { createPromotionManager } from '@/lib/promotion/promotion-manager';

/**
 * GET /api/promotion/diff
 *
 * Get the diff between staging and production to see what would be promoted.
 * This is a read-only operation that shows:
 * - Commits in staging not in production
 * - Files that would be changed
 * - Lines added/deleted
 *
 * Response:
 * {
 *   "success": true,
 *   "diff": {
 *     "ahead": 5,        // commits in staging ahead of production
 *     "behind": 0,       // commits in production ahead of staging
 *     "files": [...],    // file changes
 *     "commits": [...]   // commit list
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('='.repeat(80));
    console.log('GET PROMOTION DIFF');
    console.log('='.repeat(80));

    const promotionManager = createPromotionManager();

    // Get diff between staging and production
    const diff = await promotionManager.getDiff();

    console.log(`Diff summary:`);
    console.log(`  - ${diff.ahead} commit(s) ahead`);
    console.log(`  - ${diff.behind} commit(s) behind`);
    console.log(`  - ${diff.files.length} file(s) changed`);
    console.log('='.repeat(80));

    return NextResponse.json({
      success: true,
      diff,
    });
  } catch (error) {
    console.error('Failed to get promotion diff:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get promotion diff',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
