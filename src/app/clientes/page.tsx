'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LawyerHeader from '@/components/lawyer/LawyerHeader';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  contactAddress: string | null;
  createdAt: string;
  _count: {
    cases: number;
  };
}

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch clients
  const fetchClients = async (searchQuery = '') => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/clients${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();
      setClients(data.clients);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load clients on mount
  useEffect(() => {
    fetchClients();
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Delete client
  const handleDelete = async (clientId: string, clientName: string) => {
    if (!confirm(`¿Estás seguro que deseas eliminar al cliente ${clientName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete client');
      }

      // Refresh list
      fetchClients(search);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <>
      <LawyerHeader
        title="Clientes"
        subtitle="Gestiona tus clientes y su información"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Header with search and create button */}
        <div className="mb-6 flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Create button */}
          <button
            onClick={() => router.push('/clientes/nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Cliente
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            Error: {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Cargando clientes...</p>
          </div>
        ) : clients.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {search ? 'No se encontraron clientes que coincidan con tu búsqueda.' : 'Aún no tienes clientes registrados.'}
            </p>
            {!search && (
              <button
                onClick={() => router.push('/clientes/nuevo')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5" />
                Crear Primer Cliente
              </button>
            )}
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Casos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/clientes/${client.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {client.firstName} {client.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {client.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {client.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {client._count.cases} {client._count.cases === 1 ? 'caso' : 'casos'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/clientes/${client.id}/editar`);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Editar"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client.id, `${client.firstName} ${client.lastName}`);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        {!loading && clients.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Mostrando {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
          </div>
        )}
      </div>
    </>
  );
}
