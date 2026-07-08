import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="page-container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
            <Compass size={18} />
          </span>
          <div>
            <p className="font-black text-black">Campus Clubs</p>
            <p className="text-sm text-slate-500">Student events management</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            ['Home', '/'],
            ['About', '/about'],
            ['Contact', '/contact'],
          ].map(([label, path]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="rounded-full px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-black"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
