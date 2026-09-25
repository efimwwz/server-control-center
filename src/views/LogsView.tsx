import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { api } from '../services/api';
import {
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Play,
  Pause
} from 'lucide-react';

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [source, setSource] = useState<'all' | 'nginx' | 'docker' | 'systemd'>('all');
  const [level, setLevel] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getLogs({
        source: source !== 'all' ? source : undefined,
        level: level !== 'all' ? level : undefined,
        query: searchQuery.trim() || undefined,
        limit: 100
      });
      setLogs(data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [source, level, searchQuery]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, source, level, searchQuery]);

  const handleCopy = (log: LogEntry) => {
    const text = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}/${log.service}] ${log.message}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getLevelBadge = (lvl: string) => {
    if (lvl === 'error') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-3 w-3" />
          ERR
        </span>
      );
    }
    if (lvl === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
          <AlertTriangle className="h-3 w-3" />
          WARN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
        <Info className="h-3 w-3" />
        INFO
      </span>
    );
  };

  const getSourceColor = (src: string) => {
    if (src === 'nginx') return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    if (src === 'docker') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  };

  return (
    <div className="space-y-4">
      {/* Filters & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Tabs */}
          <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {(['all', 'nginx', 'docker', 'systemd'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  source === s
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Level Tabs */}
          <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {(['all', 'info', 'warning', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium uppercase transition-colors ${
                  level === lvl
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search message, service..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          {/* Live Tail Toggle */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume live log streaming' : 'Pause live log streaming'}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              isPaused
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isPaused ? 'Paused' : 'Streaming'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="rounded-xl border border-zinc-700 bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 font-mono text-xs shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-4 py-2 text-zinc-400">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-zinc-300">Journal & Service Output</span>
            <span className="text-[11px] text-zinc-500">({logs.length} entries)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Buffer: 100 max</span>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto divide-y divide-zinc-900/90 p-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="group flex flex-col sm:flex-row sm:items-start justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-zinc-900/60"
            >
              <div className="flex flex-wrap items-start gap-2.5">
                <span className="text-zinc-500 shrink-0 text-[11px]">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>

                {getLevelBadge(log.level)}

                <span
                  className={`rounded border px-1.5 py-0.2 text-[10px] uppercase font-semibold shrink-0 ${getSourceColor(
                    log.source
                  )}`}
                >
                  {log.source}/{log.service}
                </span>

                <span
                  className={`break-all leading-relaxed ${
                    log.level === 'error'
                      ? 'text-rose-300 font-medium'
                      : log.level === 'warning'
                      ? 'text-amber-200'
                      : 'text-zinc-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>

              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopy(log)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  title="Copy log entry"
                >
                  {copiedId === log.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="py-12 text-center text-zinc-500">
              No log entries match the current filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
