import { NextRequest, NextResponse } from 'next/server';
import { createGitManager } from '@/lib/code-modification/git-manager';

/**
 * GET /api/code/history
 *
 * Returns git commit history for the staging branch.
 * Shows all code modifications made by the AI agent.
 */
export async function GET(request: NextRequest) {
  try {
    const projectRoot = process.cwd();
    const gitManager = createGitManager(projectRoot);

    // Get commit history (last 50 commits)
    const logResult = await gitManager.getLog(50);

    if (!logResult.success || !logResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve commit history',
        },
        { status: 500 }
      );
    }

    // simple-git returns log with .all array containing commits
    const logData = logResult.data as any;
    const commits = (logData.all || []).map((commit: any) => ({
      hash: commit.hash,
      shortHash: commit.hash.substring(0, 7),
      message: commit.message,
      author: commit.author_name,
      date: commit.date,
      files: [], // File information not available in simple log
    }));

    return NextResponse.json({
      success: true,
      commits,
    });
  } catch (error) {
    console.error('Error fetching commit history:', error);

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
