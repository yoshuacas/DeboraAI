'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Admin Header Component
 *
 * Shows user info and logout button in admin pages.
 */
export default function AdminHeader() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (!session) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">DeboraAI Admin</h1>
          <span className="text-sm text-gray-500">|</span>
          <nav className="flex space-x-4">
            <a
              href="/admin/code"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Code Modification
            </a>
            <a
              href="/admin/promote"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Promote
            </a>
            <a
              href="/admin/history"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              History
            </a>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            <span className="font-medium">{session.user?.name}</span>
            <span className="text-gray-500 ml-2">({session.user?.email})</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
