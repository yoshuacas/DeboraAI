import LawyerHeader from '@/components/lawyer/LawyerHeader';

export default function DocumentosPage() {
  return (
    <>
      <LawyerHeader
        title="Documentos"
        subtitle="Navegador de documentos"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Navegador de documentos - En construcción</p>
        </div>
      </div>
    </>
  );
}
