import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import LawyerHeader from '@/components/lawyer/LawyerHeader';
import StatsCard from '@/components/lawyer/StatsCard';
import {
  UsersIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

/**
 * Dashboard Page
 *
 * Main landing page for lawyers.
 * Shows overview statistics and quick access to common tasks.
 */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // Fetch statistics from database
  const [clientsCount, casesCount, documentsCount, eventsCount, activeCases] =
    await Promise.all([
      prisma.client.count({
        where: { lawyerId: userId },
      }),
      prisma.case.count({
        where: { client: { lawyerId: userId } },
      }),
      prisma.supportDocument.count({
        where: { case: { client: { lawyerId: userId } } },
      }),
      prisma.calendarEvent.count({
        where: { case: { client: { lawyerId: userId } } },
      }),
      prisma.case.count({
        where: {
          client: { lawyerId: userId },
          status: 'IN_PROGRESS',
        },
      }),
    ]);

  // Get recent cases
  const recentCases = await prisma.case.findMany({
    where: {
      client: { lawyerId: userId },
    },
    include: {
      client: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  // Get upcoming events
  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      case: { client: { lawyerId: userId } },
      eventDate: {
        gte: new Date(),
      },
    },
    include: {
      case: true,
    },
    orderBy: {
      eventDate: 'asc',
    },
    take: 5,
  });

  return (
    <>
      <LawyerHeader
        title="Dashboard"
        subtitle="Bienvenido a tu panel de control"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Welcome Message */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Hola, {session?.user?.name || 'Abogado'}
          </h2>
          <p className="text-gray-600">
            Aquí tienes un resumen de tu actividad reciente
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Clientes"
            value={clientsCount}
            icon={<UsersIcon className="h-6 w-6" />}
            description="Total de clientes"
            href="/clientes"
            color="blue"
          />
          <StatsCard
            title="Casos"
            value={casesCount}
            icon={<BriefcaseIcon className="h-6 w-6" />}
            description={`${activeCases} activos`}
            href="/casos"
            color="green"
          />
          <StatsCard
            title="Documentos"
            value={documentsCount}
            icon={<DocumentTextIcon className="h-6 w-6" />}
            description="Documentos de soporte"
            href="/documentos"
            color="purple"
          />
          <StatsCard
            title="Eventos"
            value={eventsCount}
            icon={<CalendarIcon className="h-6 w-6" />}
            description="Próximos eventos"
            href="/calendario"
            color="orange"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Cases */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Casos Recientes
              </h3>
              <Link
                href="/casos"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Ver todos
              </Link>
            </div>

            {recentCases.length > 0 ? (
              <div className="space-y-3">
                {recentCases.map((caso) => (
                  <Link
                    key={caso.id}
                    href={`/casos/${caso.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{caso.title}</p>
                        <p className="text-sm text-gray-600">
                          Cliente: {caso.client.firstName} {caso.client.lastName}
                        </p>
                      </div>
                      <span
                        className={`
                          px-2 py-1 text-xs font-medium rounded-full
                          ${
                            caso.status === 'OPEN'
                              ? 'bg-blue-100 text-blue-800'
                              : caso.status === 'IN_PROGRESS'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }
                        `}
                      >
                        {caso.status === 'OPEN'
                          ? 'Abierto'
                          : caso.status === 'IN_PROGRESS'
                          ? 'En Progreso'
                          : 'Cerrado'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BriefcaseIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No tienes casos registrados</p>
                <Link
                  href="/casos/nuevo"
                  className="mt-2 inline-block text-blue-600 hover:text-blue-700"
                >
                  Crear primer caso
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Próximos Eventos
              </h3>
              <Link
                href="/calendario"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Ver calendario
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start space-x-3">
                      <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(event.eventDate).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        {event.case && (
                          <p className="text-xs text-gray-500 mt-1">
                            Caso: {event.case.title}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No tienes eventos próximos</p>
                <Link
                  href="/calendario"
                  className="mt-2 inline-block text-blue-600 hover:text-blue-700"
                >
                  Agregar evento
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/clientes/nuevo"
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500"
            >
              <UsersIcon className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-medium text-gray-900">Nuevo Cliente</h4>
              <p className="text-sm text-gray-600">Registrar un nuevo cliente</p>
            </Link>

            <Link
              href="/casos/nuevo"
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-green-500"
            >
              <BriefcaseIcon className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="font-medium text-gray-900">Nuevo Caso</h4>
              <p className="text-sm text-gray-600">Crear un nuevo caso legal</p>
            </Link>

            <Link
              href="/chat"
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500"
            >
              <CheckCircleIcon className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="font-medium text-gray-900">Consultar Debora</h4>
              <p className="text-sm text-gray-600">
                Asistente legal inteligente
              </p>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
