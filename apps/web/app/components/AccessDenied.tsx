'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';

export default function AccessDenied() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-400 text-white p-4">
      <div className="bg-slate-700 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-red-500 p-4 rounded-full">
            <Lock className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>

        <p className="mb-6">
          Sorry, you don't have permission to access this page. Only administrators can view this content.
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          <Link
            href="/"
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-4 py-2 rounded-md transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}