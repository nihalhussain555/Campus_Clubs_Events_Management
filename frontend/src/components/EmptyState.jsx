import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  message,
  actionLabel,
  onAction
}) => (
  <div className="app-card flex flex-col items-center gap-3 py-14 text-center">
    <div className="icon-tile h-14 w-14">
      <Icon size={24} />
    </div>

    <h3 className="text-lg font-black text-[#073c57]">
      {title}
    </h3>

    {message && (
      <p className="max-w-md text-sm leading-6 text-slate-600">
        {message}
      </p>
    )}

    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="btn-primary mt-2"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
