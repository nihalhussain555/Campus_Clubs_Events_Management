import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const VARIANTS = {
  success: {
    Icon: CheckCircle,
    className: 'border-emerald-200 text-emerald-800'
  },
  info: {
    Icon: Info,
    className: 'border-[#bcddeb] text-[#145f82]'
  },
  error: {
    Icon: AlertCircle,
    className: 'border-red-200 text-red-800'
  }
};

const Toast = ({ message, type = 'success', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  const variant = VARIANTS[type] || VARIANTS.error;
  const { Icon } = variant;

  return (
    <div
      className={`fixed right-4 top-24 z-50 flex max-w-sm items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.18)] ${variant.className}`}
      role="status"
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <span className="text-sm font-semibold">{message}</span>
      <button type="button" onClick={onClose} className="ml-2 rounded-full p-1 hover:bg-slate-100" aria-label="Close notification">
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
