import LawyerHeader from '@/components/lawyer/LawyerHeader';

export default function BibliotecaPage() {
  return (
    <>
      <LawyerHeader
        title="Biblioteca"
        subtitle="Leyes y jurisprudencia"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Biblioteca legal - En construcción</p>
        </div>
      </div>
    </>
  );
}
