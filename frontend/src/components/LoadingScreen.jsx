import React from 'react';
import { GraduationCap } from 'lucide-react';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">

      <div className="flex flex-col items-center">

        {/* Graduation Cap Logo */}
        <div className="relative w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg animate-pulse">

          <GraduationCap
            size={44}
            strokeWidth={1.7}
            className="text-white"
          />

        </div>

        {/* Brand */}
        <h2 className="mt-5 text-xl font-bold text-slate-900">
          Campus Clubs
        </h2>

        {/* Loading text */}
        <div className="flex items-center gap-2 mt-2">

          <span className="text-sm text-slate-500">
            {message}
          </span>

          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </span>

        </div>

      </div>

    </div>
  );
};

export default LoadingScreen;