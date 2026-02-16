'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

/**
 * LawyerHeader Component
 *
 * Top header bar for lawyer users.
 * Shows user info, logout button, and page title.
 */
interface LawyerHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function LawyerHeader({ title, subtitle }: LawyerHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title */}
        <div>
          {title && (
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          )}
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-4">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500">
                {session?.user?.email}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Cerrar sesión"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
