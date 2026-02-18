'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Case {
  id: string;
  name: string;
  court: string | null;
  status: string;
  createdAt: string;
  client: Client;
  _count: {
    supportDocs: number;
    generatedDocs: number;
    calendarEvents: number;
  };
}

const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso',
  CLOSED: 'Cerrado',
  ARCHIVED: 'Archivado'
};

export default function CasosPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [clients, setClients] = useState<Client[]>([]);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cases');
      if (response.ok) {
        const data = await response.json();
        setCases(data);
        setFilteredCases(data);
      } else {
        setError('Error al cargar casos');
      }
    } catch (err) {
      setError('Error al cargar casos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch clients for filter dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          setClients(data);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };

    fetchClients();
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Apply filters
  useEffect(() => {
    let filtered = cases;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.court?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${c.client.firstName} ${c.client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Client filter
    if (clientFilter) {
      filtered = filtered.filter((c) => c.client.id === clientFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchTerm, statusFilter, clientFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar el caso "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cases/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Error al eliminar el caso');
        return;
      }

      // Refresh the list
      fetchCases();
    } catch (err) {
      alert('Error al eliminar el caso');
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/casos/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Cargando casos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-600 mt-1">
            {filteredCases.length} {filteredCases.length === 1 ? 'caso encontrado' : 'casos encontrados'}
          </p>
        </div>
        <Link
          href="/casos/nuevo"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Nuevo Caso
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4 md:space-y-0 md:flex md:gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre, juzgado o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="OPEN">Abierto</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="CLOSED">Cerrado</option>
            <option value="ARCHIVED">Archivado</option>
          </select>
        </div>

        {/* Client Filter */}
        <div className="w-full md:w-64">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los clientes</option>
            {Array.isArray(clients) && clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {(searchTerm || statusFilter || clientFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setClientFilter('');
            }}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 whitespace-nowrap"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Cases Table */}
      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter || clientFilter
              ? 'No se encontraron casos con los filtros aplicados'
              : 'No hay casos registrados'}
          </p>
          {!searchTerm && !statusFilter && !clientFilter && (
            <Link
              href="/casos/nuevo"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Crear primer caso
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Juzgado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documentos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eventos
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(caseItem.id)}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{caseItem.name}</div>
                    <div className="text-sm text-gray-500">
                      Creado: {new Date(caseItem.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {caseItem.client.firstName} {caseItem.client.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{caseItem.client.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{caseItem.court || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        STATUS_COLORS[caseItem.status as keyof typeof STATUS_COLORS]
                      }`}
                    >
                      {STATUS_LABELS[caseItem.status as keyof typeof STATUS_LABELS]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem._count.supportDocs + caseItem._count.generatedDocs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {caseItem._count.calendarEvents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/casos/${caseItem.id}/editar`);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(caseItem.id, caseItem.name);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
