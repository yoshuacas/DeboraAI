'use client';

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * Promotion diff data
 */
interface PromotionDiff {
  ahead: number;
  behind: number;
  files: Array<{
    path: string;
    status: 'modified' | 'added' | 'deleted';
    additions: number;
    deletions: number;
  }>;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
}

/**
 * Safety check result
 */
interface SafetyCheckResult {
  passed: boolean;
  issues: string[];
}

/**
 * Promotion history item
 */
interface HistoryItem {
  hash: string;
  message: string;
  author: string;
  date: string;
  isPromotion: boolean;
}

/**
 * Admin Promotion Page
 *
 * Interface for promoting staging changes to production.
 * Shows diff, runs safety checks, and allows promotion with confirmation.
 */
export default function PromotionPage() {
  const [diff, setDiff] = useState<PromotionDiff | null>(null);
  const [safetyCheck, setSafetyCheck] = useState<SafetyCheckResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Load diff, safety checks, and history
   */
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load diff, safety checks, and history in parallel
      const [diffRes, safetyRes, historyRes] = await Promise.all([
        fetch('/api/promotion/diff'),
        fetch('/api/promotion/check'),
        fetch('/api/promotion/history?limit=10'),
      ]);

      const diffData = await diffRes.json();
      const safetyData = await safetyRes.json();
      const historyData = await historyRes.json();

      if (diffData.success) {
        setDiff(diffData.diff);
      }

      if (safetyData.success) {
        setSafetyCheck(safetyData);
      }

      if (historyData.success) {
        setHistory(historyData.history);
      }
    } catch (err) {
      setError('Failed to load promotion data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Promote staging to production
   */
  const handlePromote = async () => {
    setIsPromoting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/promotion/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performedBy: 'admin', // TODO: Get from auth session
          message: 'Promoted via admin interface',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(
          `Successfully promoted ${data.changes.commits} commit(s) with ${data.changes.filesChanged} file(s) changed`
        );
        setShowConfirm(false);

        // Reload data to show updated state
        setTimeout(() => loadData(), 1000);
      } else {
        // Show detailed error message
        const errorMessage = data.error || 'Promotion failed';
        const errorDetails = data.details ? `\n\nDetails: ${data.details}` : '';
        setError(errorMessage + errorDetails);
        console.error('Promotion failed:', data);
      }
    } catch (err) {
      setError('Failed to promote staging to production');
      console.error(err);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Promote to Production</h1>
          <p className="mt-2 text-gray-600">
            Review and promote staging changes to the live production environment
          </p>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            ✓ {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            ✗ {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading promotion data...</p>
          </div>
        )}

        {/* Main content */}
        {!isLoading && diff && (
          <div className="space-y-6">
            {/* Safety checks card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Safety Checks</h2>

              {safetyCheck && (
                <div>
                  {safetyCheck.passed ? (
                    <div className="flex items-center text-green-600">
                      <span className="text-2xl mr-2">✓</span>
                      <span className="font-medium">All checks passed - ready to promote</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center text-red-600 mb-3">
                        <span className="text-2xl mr-2">✗</span>
                        <span className="font-medium">Safety checks failed</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {safetyCheck.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Diff summary card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes to Promote</h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{diff.commits.length}</div>
                  <div className="text-sm text-gray-600">Commits</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{diff.files.length}</div>
                  <div className="text-sm text-gray-600">Files Changed</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-gray-700">
                    +{diff.files.reduce((sum, f) => sum + f.additions, 0)}{' '}
                    <span className="text-red-600">
                      -{diff.files.reduce((sum, f) => sum + f.deletions, 0)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Lines Changed</div>
                </div>
              </div>

              {/* Commits list */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Commits</h3>
                <div className="space-y-2">
                  {diff.commits.map((commit) => (
                    <div key={commit.hash} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="font-mono text-sm text-gray-500">
                        {commit.hash.substring(0, 7)}
                      </div>
                      <div className="text-gray-900">{commit.message}</div>
                      <div className="text-sm text-gray-600">
                        {commit.author} • {new Date(commit.date).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Files list */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Files Changed</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {diff.files.map((file, idx) => (
                    <div key={idx} className="flex items-center text-sm font-mono">
                      <span
                        className={`mr-2 ${
                          file.status === 'added'
                            ? 'text-green-600'
                            : file.status === 'deleted'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {file.status === 'added' ? '+' : file.status === 'deleted' ? '-' : '•'}
                      </span>
                      <span className="flex-1">{file.path}</span>
                      <span className="text-green-600 ml-4">+{file.additions}</span>
                      <span className="text-red-600 ml-2">-{file.deletions}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Promote button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!safetyCheck?.passed || diff.ahead === 0}
                  className={`w-full py-3 px-6 rounded-lg font-medium text-white ${
                    safetyCheck?.passed && diff.ahead > 0
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Promote to Production
                </button>
              ) : (
                <div>
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-medium text-yellow-900">⚠️ Confirm Promotion</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      This will deploy {diff.commits.length} commit(s) to the live production
                      environment. This action cannot be undone automatically.
                    </p>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handlePromote}
                      disabled={isPromoting}
                      className="flex-1 py-3 px-6 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
                    >
                      {isPromoting ? 'Promoting...' : 'Yes, Promote Now'}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={isPromoting}
                      className="flex-1 py-3 px-6 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Promotion history */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Promotions</h2>
              <div className="space-y-3">
                {history.filter((h) => h.isPromotion).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No promotions yet</p>
                ) : (
                  history
                    .filter((h) => h.isPromotion)
                    .map((item) => (
                      <div key={item.hash} className="border-l-4 border-green-500 pl-4 py-2">
                        <div className="font-mono text-sm text-gray-500">
                          {item.hash.substring(0, 7)}
                        </div>
                        <div className="text-gray-900">{item.message}</div>
                        <div className="text-sm text-gray-600">
                          {item.author} • {new Date(item.date).toLocaleString()}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
