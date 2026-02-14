import { NextRequest, NextResponse } from 'next/server';
import { createPromotionManager } from '@/lib/promotion/promotion-manager';

/**
 * GET /api/promotion/check
 *
 * Run safety checks before promotion without actually promoting.
 * This allows administrators to verify readiness before clicking "Promote".
 *
 * Checks:
 * - No uncommitted changes in staging
 * - Production branch is clean
 * - Correct branches are checked out
 * - Staging is up to date with remote
 * - There are changes to promote
 *
 * Response:
 * {
 *   "success": true,
 *   "passed": true,
 *   "issues": []
 * }
 *
 * Or if checks fail:
 * {
 *   "success": true,
 *   "passed": false,
 *   "issues": [
 *     "Staging has uncommitted changes",
 *     "No changes to promote"
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Running promotion safety checks...');

    const promotionManager = createPromotionManager();

    // Run safety checks
    const result = await promotionManager.runSafetyChecks();

    if (result.passed) {
      console.log('✓ All safety checks passed');
    } else {
      console.log('✗ Safety checks failed:');
      result.issues.forEach((issue) => console.log(`  - ${issue}`));
    }

    return NextResponse.json({
      success: true,
      passed: result.passed,
      issues: result.issues,
    });
  } catch (error) {
    console.error('Safety check failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run safety checks',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
