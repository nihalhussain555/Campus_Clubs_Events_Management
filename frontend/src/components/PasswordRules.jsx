import React from 'react';
import { Check, X } from 'lucide-react';
import { PASSWORD_RULES } from '../utils/passwordPolicy';

// The requirement list in its own row-sized bars: one column keeps the icons
// and labels on a single left edge even inside the narrow settings columns.
const PasswordRules = ({ value, className = '' }) => (
  <ul className={`space-y-1.5 ${className}`}>
    {PASSWORD_RULES.map((rule) => {
      const satisfied = Boolean(value) && rule.test(value);

      return (
        <li
          key={rule.id}
          className={
            satisfied
              ? 'flex min-h-8 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
              : 'flex min-h-8 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500'
          }
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {satisfied ? <Check size={14} /> : <X size={14} />}
          </span>

          <span className="flex-1 leading-snug">{rule.label}</span>
        </li>
      );
    })}
  </ul>
);

export default PasswordRules;
