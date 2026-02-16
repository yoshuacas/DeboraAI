import LawyerHeader from '@/components/lawyer/LawyerHeader';

export default function ChatPage() {
  return (
    <>
      <LawyerHeader
        title="Chat con Debora"
        subtitle="Asistente legal inteligente"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Chat con Debora AI - En construcción</p>
        </div>
      </div>
    </>
  );
}
