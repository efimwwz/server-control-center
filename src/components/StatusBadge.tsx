import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toUpperCase();

  let bgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let dotClass = 'bg-emerald-400';

  if (normalized === 'STOPPED' || normalized === 'INACTIVE') {
    bgClass = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
    dotClass = 'bg-zinc-400';
  } else if (normalized === 'RESTARTING' || normalized === 'WARNING') {
    bgClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    dotClass = 'bg-amber-400 animate-pulse';
  } else if (normalized === 'ERROR' || normalized === 'CRITICAL' || normalized === 'FAILED') {
    bgClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    dotClass = 'bg-rose-400 animate-ping';
  }

  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium uppercase tracking-wider ${bgClass} ${paddingClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {normalized}
    </span>
  );
};
