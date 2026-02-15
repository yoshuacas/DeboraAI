import ChatInterface from '@/components/admin/ChatInterface';
import AdminHeader from '@/components/admin/AdminHeader';

/**
 * Admin Code Modification Dashboard
 *
 * Main interface for admins to interact with the AI coding agent.
 * Allows natural language requests to modify the staging codebase.
 */
export default function AdminCodePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Code Modification</h1>
          <p className="mt-2 text-gray-600">
            Use natural language to modify your application's codebase in the staging environment.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How it works</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Request changes:</strong> Describe what you want in natural language
                  </li>
                  <li>
                    <strong>AI modifies staging:</strong> Claude Agent SDK directly edits files
                  </li>
                  <li>
                    <strong>Automatic testing:</strong> All changes are tested before committing
                  </li>
                  <li>
                    <strong>Version control:</strong> Every change is tracked with git commits
                  </li>
                  <li>
                    <strong>Promote to production:</strong> When ready, promote tested changes
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="h-[600px]">
          <ChatInterface />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/history"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900">Change History</h3>
            <p className="mt-1 text-sm text-gray-600">
              View all past code modifications and commits
            </p>
          </a>

          <a
            href="/admin/promote"
            className="block p-4 bg-white border border-green-200 rounded-lg hover:shadow-md transition-shadow bg-green-50"
          >
            <h3 className="font-medium text-green-900">Promote to Production</h3>
            <p className="mt-1 text-sm text-green-700">
              Deploy tested staging changes to live site
            </p>
          </a>

          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900">View Staging</h3>
            <p className="mt-1 text-sm text-gray-600">
              Test your changes in the staging environment
            </p>
          </a>

          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900">View Production</h3>
            <p className="mt-1 text-sm text-gray-600">
              See what customers are currently using
            </p>
          </a>
        </div>
      </div>
      </div>
    </div>
  );
}
