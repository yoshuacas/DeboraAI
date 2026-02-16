'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

/**
 * LawyerSidebar Component
 *
 * Main navigation sidebar for lawyer users.
 * Shows all available sections of the legal application.
 */
export default function LawyerSidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Inicio', href: '/dashboard', icon: HomeIcon },
    { name: 'Clientes', href: '/clientes', icon: UsersIcon },
    { name: 'Casos', href: '/casos', icon: BriefcaseIcon },
    { name: 'Documentos', href: '/documentos', icon: DocumentTextIcon },
    { name: 'Chat con Debora', href: '/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Biblioteca', href: '/biblioteca', icon: BookOpenIcon },
    { name: 'Plantillas', href: '/plantillas', icon: ClipboardDocumentListIcon },
    { name: 'Calendario', href: '/calendario', icon: CalendarIcon },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800 px-4">
        <h1 className="text-xl font-bold text-white">DeboraAI</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <Icon
                className={`
                  mr-3 h-6 w-6 flex-shrink-0
                  ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}
                `}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-4">
        <p className="text-xs text-gray-400 text-center">
          DeboraAI © 2026
        </p>
      </div>
    </div>
  );
}
