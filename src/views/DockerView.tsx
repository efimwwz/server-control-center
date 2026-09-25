import React, { useState } from 'react';
import { DockerOverview, DockerContainer } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Box,
  Search,
  Filter,
  Info,
  Layers,
  Terminal,
  Cpu,
  Server,
  Network,
  X,
  Copy,
  Check
} from 'lucide-react';

interface DockerViewProps {
  docker: DockerOverview | null;
  onRefresh: () => void;
}

export const DockerView: React.FC<DockerViewProps> = ({ docker }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'STOPPED' | 'RESTARTING' | 'ERROR'>('ALL');
  const [selectedContainer, setSelectedContainer] = useState<DockerContainer | null>(null);
  const [copiedPort, setCopiedPort] = useState<string | null>(null);

  if (!docker) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Fetching Docker container stats...</span>
        </div>
      </div>
    );
  }

  const containers = docker.containers || [];

  const filteredContainers = containers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.image.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ports.some((p) => p.includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyPort = (port: string) => {
    navigator.clipboard.writeText(port);
    setCopiedPort(port);
    setTimeout(() => setCopiedPort(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Docker Status Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">Total Containers</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white">{docker.total}</div>
          <div className="mt-1 font-mono text-[10px] text-zinc-500">{docker.engineVersion}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="text-xs text-emerald-400">Running (UP)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-400">{docker.running}</div>
          <div className="mt-1 text-[11px] text-zinc-500">Active services</div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="text-xs text-zinc-400">Stopped</div>
          <div className="mt-1 font-mono text-2xl font-bold text-zinc-400">{docker.stopped}</div>
          <div className="mt-1 text-[11px] text-zinc-500">Exited clean</div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="text-xs text-amber-400">Restarting</div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-400">{docker.restarting}</div>
          <div className="mt-1 text-[11px] text-zinc-500">In loop</div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="text-xs text-rose-400">Error</div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-400">{docker.error}</div>
          <div className="mt-1 text-[11px] text-zinc-500">Unhealthy</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search containers by name, image, or port..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          {(['ALL', 'UP', 'STOPPED', 'RESTARTING', 'ERROR'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Containers Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-xs font-semibold uppercase text-zinc-400">
              <tr>
                <th className="px-5 py-3.5">Container</th>
                <th className="px-5 py-3.5">Image</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Uptime</th>
                <th className="px-5 py-3.5">CPU</th>
                <th className="px-5 py-3.5">RAM</th>
                <th className="px-5 py-3.5">Ports</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
              {filteredContainers.map((container) => (
                <tr
                  key={container.id}
                  className="transition-colors hover:bg-zinc-800/30"
                >
                  <td className="px-5 py-4 font-sans font-medium text-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Box className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100">{container.name}</div>
                        <div className="font-mono text-[10px] text-zinc-500">{container.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-zinc-300">
                    <span className="rounded bg-zinc-800/70 px-2 py-1 text-[11px] text-zinc-300">
                      {container.image}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={container.status} size="sm" />
                  </td>

                  <td className="px-5 py-4 text-zinc-300">{container.uptime}</td>

                  <td className="px-5 py-4 text-zinc-200">
                    <span className={container.cpuPercent > 10 ? 'text-amber-400 font-bold' : ''}>
                      {container.cpuPercent}%
                    </span>
                  </td>

                  <td className="px-5 py-4 text-zinc-200">
                    {container.memoryFormatted.split('/')[0].trim()}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {container.ports.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCopyPort(p)}
                          title="Click to copy port mapping"
                          className="group flex items-center gap-1 rounded border border-zinc-700/60 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-emerald-500/50 hover:bg-zinc-800"
                        >
                          <span>{p}</span>
                          {copiedPort === p ? (
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      ))}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedContainer(container)}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-sans text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}

              {filteredContainers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-zinc-500 font-sans">
                    No containers found matching filter "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Notice regarding browser shell execution */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs text-zinc-400 flex items-start gap-3">
        <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-200">Security Architecture Note: </span>
          In accordance with security standards, container management actions (start, stop, restart, rm) are not executed directly through arbitrary shell commands from the client.
          The backend provides a structured REST API layer ready for socket-based Docker Engine integration (`/var/run/docker.sock`).
        </div>
      </div>

      {/* Container Details Modal */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedContainer.name}</h3>
                  <div className="font-mono text-xs text-zinc-400">ID: {selectedContainer.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedContainer(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-zinc-500">Image</div>
                  <div className="mt-1 font-mono text-zinc-200">{selectedContainer.image}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-zinc-500">Status & Health</div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={selectedContainer.status} size="sm" />
                    <span className="text-zinc-300">{selectedContainer.statusDetail}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-zinc-500">CPU Allocation</div>
                  <div className="mt-1 font-mono text-zinc-200">{selectedContainer.cpuPercent}% of host</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="text-zinc-500">Memory Usage</div>
                  <div className="mt-1 font-mono text-zinc-200">{selectedContainer.memoryFormatted}</div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-zinc-500">Exposed Network Ports</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {selectedContainer.ports.map((p, i) => (
                    <span key={i} className="rounded bg-zinc-800 px-2 py-1 font-mono text-emerald-400">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-zinc-500">Entrypoint Command</div>
                <div className="mt-1 font-mono text-zinc-300 bg-zinc-900 p-2 rounded border border-zinc-800/80">
                  {selectedContainer.command}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-zinc-500">Created Timestamp</div>
                <div className="mt-1 font-mono text-zinc-300">{selectedContainer.created} (Restarts: {selectedContainer.restartCount})</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedContainer(null)}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
