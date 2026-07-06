import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400';
  const textColor = type === 'success' ? 'text-green-700' : 'text-red-700';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} border-l-4 ${textColor} p-4 rounded shadow-lg flex items-center gap-2 max-w-sm`}>
      <Icon size={20} />
      <span>{message}</span>
    </div>
  );
};

export default Toast;
