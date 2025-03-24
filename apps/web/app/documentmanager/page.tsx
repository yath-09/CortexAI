// In your page file
import DocumentManager from '../components/DocumentManager';

export default function Documents() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-400 text-white md:p-8 pt-8">
      <div className="container mx-auto px-2 md:px-4 py-8">
        <DocumentManager />
      </div>
    </main>
  );
}