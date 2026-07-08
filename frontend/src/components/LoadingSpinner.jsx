import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f9fb] px-4">
      <div className="app-card text-center">
        <Loader className="mx-auto mb-4 animate-spin text-[#145f82]" size={42} />
        <p className="font-bold text-slate-700">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
