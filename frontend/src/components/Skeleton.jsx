import React from 'react';

export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div
    className={`animate-pulse rounded-xl bg-slate-200 ${className}`}
    aria-hidden="true"
  />
);

const SkeletonCard = () => (
  <div className="app-card space-y-4">
    <Skeleton className="h-6 w-2/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-10 w-28 rounded-full" />
      <Skeleton className="h-10 w-28 rounded-full" />
    </div>
  </div>
);

// Replaces full-page spinners while a list is loading.
const SkeletonGrid = ({ count = 6, className = 'grid gap-5 lg:grid-cols-2' }) => (
  <div className={className} role="status" aria-label="Loading">
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);

export default SkeletonGrid;
