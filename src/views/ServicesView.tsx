import React, { useState } from 'react';
import { SystemService } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Layers,
  Terminal,
  Shield,
  Clock,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Info
} from 'lucide-react';

interface ServicesViewProps {
  services: SystemService[] | null;
  onRefresh: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ services }) => {
  const [selectedService, setSelectedService] = useState<SystemService | null>(null);

  if (!services) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Querying systemd services...</span>
        </div>
      </div>
    );
  }

  const allActive = services.every((s) => s.status === 'active');

  return (
    <div className="space-y-6">
      {/* Services Overview Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Systemd Daemons & Services</h2>
            <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-400 border border-emerald-500/30">
              {allActive ? 'ALL ACTIVE' : 'ISSUES DETECTED'}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Core Ubuntu 24.04 LTS background services managed via systemctl
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2">
            <div className="text-[11px] text-zinc-500">Tracked Units</div>
            <div className="font-mono text-base font-bold text-white">{services.length} services</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2">
            <div className="text-[11px] text-zinc-500">Failed Units</div>
            <div className="font-mono text-base font-bold text-emerald-400">0</div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => (
          <div
            key={svc.unitName}
            className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 transition-all hover:border-zinc-700/80 hover:bg-zinc-900/80"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-zinc-100">{svc.name}</span>
                    {svc.enabledOnBoot && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        enabled
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-zinc-500">{svc.unitName}</div>
                </div>
                <StatusBadge status={svc.status} size="sm" />
              </div>

              <p className="mt-3 text-xs text-zinc-400 line-clamp-2">
                {svc.description}
              </p>
            </div>

            <div className="mt-5 space-y-2 border-t border-zinc-800/60 pt-3 font-mono text-xs text-zinc-400">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Sub-State:</span>
                <span className="font-semibold text-emerald-400">{svc.subStatus}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Uptime:</span>
                <span className="text-zinc-200">{svc.uptime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Main PID:</span>
                <span className="text-zinc-300">#{svc.pid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Memory RSS:</span>
                <span className="text-zinc-300">{svc.memoryFormatted}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Systemctl Architecture Note */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-xs text-zinc-400 flex items-start gap-3">
        <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-200">Systemctl Integration Layer: </span>
          The service status is pulled through the `ServicesMetricsProvider` interface. In production, this can query `systemd` via D-Bus `/org/freedesktop/systemd1` or non-privileged read-only status calls without allowing arbitrary command injection.
        </div>
      </div>
    </div>
  );
};
