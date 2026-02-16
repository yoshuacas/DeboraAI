import LawyerHeader from '@/components/lawyer/LawyerHeader';

export default function CalendarioPage() {
  return (
    <>
      <LawyerHeader
        title="Calendario"
        subtitle="Eventos y fechas importantes"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Calendario - En construcción</p>
        </div>
      </div>
    </>
  );
}
