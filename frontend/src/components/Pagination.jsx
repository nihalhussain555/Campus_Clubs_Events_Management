import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Shows at most 5 numbered buttons around the current page.
const windowedPages = (page, totalPages) => {
  const span = 2;
  let start = Math.max(1, page - span);
  const end = Math.min(totalPages, start + span * 2);

  if (end - start < span * 2) {
    start = Math.max(1, end - span * 2);
  }

  return Array.from(
    { length: end - start + 1 },
    (_, index) => start + index
  );
};

const Pagination = ({ page, totalPages, onChange }) => {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  const go = (next) => {
    if (next < 1 || next > totalPages || next === page) {
      return;
    }

    onChange(next);
  };

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="btn-secondary px-3"
        aria-label="Previous page"
      >
        <ChevronLeft size={18} />
      </button>

      {windowedPages(page, totalPages).map((number) => (
        <button
          key={number}
          type="button"
          onClick={() => go(number)}
          aria-current={number === page ? 'page' : undefined}
          className={`h-11 min-w-11 rounded-full px-3 text-sm font-bold transition ${
            number === page
              ? 'bg-[#145f82] text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:border-[#2d7a9b] hover:text-[#145f82]'
          }`}
        >
          {number}
        </button>
      ))}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="btn-secondary px-3"
        aria-label="Next page"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
};

export default Pagination;
