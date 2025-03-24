"use client";

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        className: 'bg-slate-800 text-white',
        duration: 4000,
        success: {
          className: 'bg-green-600 text-white',
          iconTheme: {
            primary: 'white',
            secondary: 'green',
          },
        },
        error: {
          className: 'bg-red-600 text-white',
          iconTheme: {
            primary: 'white',
            secondary: 'red',
          },
        },
      }}
    />
  );
}