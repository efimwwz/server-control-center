import React, { useState, useEffect } from 'react';
import { SystemInfo } from '../types';
import {
  Server,
  Clock,
  RefreshCw,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Radio
} from 'lucide-react';

interface HeaderProps {
  systemInfo: SystemInfo | null;
  isLoading: boolean;
  onRefresh: () => void;
  lastRefreshedAt: Date | null;
  serverDisplayName?: string;
  refreshIntervalSeconds: number;
}

export const Header: React.FC<HeaderProps> = ({
  systemInfo,
  isLoading,
  onRefresh,
  lastRefreshedAt,
  serverDisplayName,
  refreshIntervalSeconds
}) => {
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const status = systemInfo?.status || 'online';

  const getStatusBadge = () => {
    if (status === 'critical') {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-mono text-xs font-semibold text-rose-400">
          <AlertOctagon className="h-3.5 w-3.5 animate-bounce" />
          CRITICAL
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          WARNING
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        ONLINE
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-6 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Host identity & badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600/30 to-teal-400/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-zinc-100">
                  {systemInfo?.hostname || serverDisplayName || 'Server'}
                </span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                <span className="text-zinc-300 font-medium">{systemInfo?.os || 'Ubuntu 24.04 LTS'}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{systemInfo?.kernel || 'Linux 6.8.0-45-generic'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live uptime, clock, refresh */}
        <div className="flex flex-wrap items-center gap-3 text-xs sm:gap-4">
          {/* Uptime */}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-zinc-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-zinc-500">UP:</span>
            <span className="font-semibold text-zinc-200">
              {systemInfo?.uptimeFormatted || '14d 6h 24m'}
            </span>
          </div>

          {/* Current Time Clock */}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-zinc-200">{currentTime}</span>
          </div>

          {/* Auto refresh pulse */}
          <div className="hidden items-center gap-1.5 text-zinc-500 md:flex">
            <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">{refreshIntervalSeconds}s sync</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh metrics immediately"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 px-3 py-1.5 font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
