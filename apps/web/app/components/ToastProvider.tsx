"use client";

import { Toaster } from 'react-hot-toast';
import { 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        duration: 5000,
        // Success toast configuration
        success: {
          icon: <CheckCircle2 size={24} color="#4ADE80" />,
          style: {
            background: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)', // Soft to vibrant green
            border: '2px solid #10b981', // Emerald green border
            color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          },
          iconTheme: {
            primary: '#4ADE80', // Bright green
            secondary: '#86efac', // Light green
          },
        },
        // Error toast configuration
        error: {
          icon: <XCircle size={24} color="#F87171" />,
          style: {
            background: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)', // Soft to vibrant red
            border: '2px solid #dc2626', // Deep red border
            color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          },
          iconTheme: {
            primary: '#F87471', // Soft red
            secondary: '#fca5a5', // Light red
          },
        }, 
        // Default style
        style: {
          background: 'linear-gradient(135deg, #a78bfa 0%, #6366f1 100%)', // Light purple to indigo
          color: 'white',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        },
      }}
    />
  );
}