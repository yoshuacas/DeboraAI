'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * Git commit information
 */
interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

/**
 * Admin Change History Page
 *
 * Displays all past code modifications made by the AI agent.
 * Shows git commit history with details.
 */
export default function AdminHistoryPage() {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCommitHistory();
  }, []);

  /**
   * Load commit history from API
   */
  const loadCommitHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/code/history');

      if (!response.ok) {
        throw new Error('Failed to load commit history');
      }

      const data = await response.json();
      setCommits(data.commits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Change History</h1>
          <p className="mt-2 text-gray-600">
            All code modifications made by the AI agent in the staging environment.
          </p>
        </div>

        {/* Back link */}
        <div className="mb-6">
          <a
            href="/admin/code"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Code Modification
          </a>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading commit history...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <p className="mt-2 text-sm text-red-600">
              Note: The history API endpoint is not yet implemented. This will show git commits once the API is ready.
            </p>
          </div>
        )}

        {/* Commits list */}
        {!isLoading && !error && commits.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No changes yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Code modifications will appear here once you make requests through the AI agent.
            </p>
          </div>
        )}

        {!isLoading && !error && commits.length > 0 && (
          <div className="space-y-4">
            {commits.map((commit) => (
              <div
                key={commit.hash}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Commit header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{commit.message}</h3>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {commit.shortHash}
                      </span>
                      <span>{commit.author}</span>
                      <span>{formatDate(commit.date)}</span>
                    </div>
                  </div>
                </div>

                {/* Files changed */}
                {commit.files && commit.files.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Files changed ({commit.files.length}):
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {commit.files.map((file, idx) => (
                        <li key={idx} className="font-mono">
                          • {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-3">
                  <button
                    onClick={() => {
                      // TODO: Implement view diff
                      alert('View diff functionality coming soon');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Diff
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement revert
                      if (
                        confirm(
                          `Are you sure you want to revert this commit?\n\nCommit: ${commit.shortHash}\n${commit.message}`
                        )
                      ) {
                        alert('Revert functionality coming soon');
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Revert
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
