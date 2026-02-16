import LawyerHeader from '@/components/lawyer/LawyerHeader';

export default function PlantillasPage() {
  return (
    <>
      <LawyerHeader
        title="Plantillas"
        subtitle="Documentos legales predefinidos"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Plantillas de documentos - En construcción</p>
        </div>
      </div>
    </>
  );
}
