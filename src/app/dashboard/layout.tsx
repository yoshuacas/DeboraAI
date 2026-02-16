import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import LawyerSidebar from '@/components/lawyer/LawyerSidebar';

/**
 * Dashboard Layout
 *
 * Layout for all lawyer dashboard pages.
 * Includes sidebar navigation and main content area.
 * Protected route - only accessible to authenticated LAWYER users.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login?callbackUrl=/dashboard');
  }

  // Check if user is LAWYER or ADMIN (admins can access everything)
  const userRole = (session.user as any)?.role;
  if (userRole !== 'LAWYER' && userRole !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <LawyerSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
