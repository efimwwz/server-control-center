import React from 'react';
import { SystemMetrics, DockerOverview, NginxStats } from '../types';
import { AreaChart, DataPoint } from '../components/Charts/AreaChart';
import { MiniSparkline } from '../components/Charts/MiniSparkline';
import { StatusBadge } from '../components/StatusBadge';
import {
  Cpu,
  Server,
  HardDrive,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Box,
  Globe,
  Thermometer,
  Layers
} from 'lucide-react';

interface DashboardViewProps {
  system: SystemMetrics | null;
  docker: DockerOverview | null;
  nginx: NginxStats | null;
  onNavigate: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  system,
  docker,
  nginx,
  onNavigate
}) => {
  if (!system) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Loading system metrics...</span>
        </div>
      </div>
    );
  }

  // Prepare chart series from history
  const history = system.history || [];

  const cpuData: DataPoint[] = history.map((h) => ({
    label: h.time,
    value: h.cpu
  }));

  const ramData: DataPoint[] = history.map((h) => ({
    label: h.time,
    value: h.ram
  }));

  const netData: DataPoint[] = history.map((h) => ({
    label: h.time,
    value: h.networkRxKbps,
    value2: h.networkTxKbps
  }));

  const loadData: DataPoint[] = history.map((h) => ({
    label: h.time,
    value: h.load1m
  }));

  const ramUsedGb = (system.ram.usedBytes / (1024 * 1024 * 1024)).toFixed(2);
  const ramTotalGb = (system.ram.totalBytes / (1024 * 1024 * 1024)).toFixed(1);
  const ramFreeGb = (system.ram.freeBytes / (1024 * 1024 * 1024)).toFixed(2);

  const diskUsedGb = (system.disk.usedBytes / (1024 * 1024 * 1024)).toFixed(1);
  const diskTotalGb = (system.disk.totalBytes / (1024 * 1024 * 1024)).toFixed(1);
  const diskFreeGb = (system.disk.freeBytes / (1024 * 1024 * 1024)).toFixed(1);
  const networkInterfaceLabel = system.network.interfaceName
    ? `${system.network.interfaceName} · default route`
    : 'Default route interface unavailable';
  const nginxSuccessRate =
    nginx && nginx.totalRequests > 0
      ? `${((nginx.statusCodeCounts.code2xx / nginx.totalRequests) * 100).toFixed(1)}%`
      : '—';

  return (
    <div className="space-y-6">
      {/* 6 Core Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. CPU Usage */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">CPU Usage</span>
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {system.cpu.usagePercent}%
            </span>
            {system.cpu.temperatureC && (
              <span className="flex items-center text-xs text-zinc-400">
                <Thermometer className="h-3 w-3 text-amber-400 mr-0.5" />
                {system.cpu.temperatureC}°C
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  system.cpu.usagePercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, system.cpu.usagePercent)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{system.info.cpuCores} vCPU</span>
            <MiniSparkline data={history.slice(-15).map((h) => h.cpu)} color="#10b981" />
          </div>
        </div>

        {/* 2. RAM Usage */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">RAM Usage</span>
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {system.ram.usagePercent}%
            </span>
            <span className="text-xs text-zinc-400">
              {ramUsedGb}/{ramTotalGb} GB
            </span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, system.ram.usagePercent)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Available: {ramFreeGb} GB</span>
            <MiniSparkline data={history.slice(-15).map((h) => h.ram)} color="#3b82f6" />
          </div>
        </div>

        {/* 3. Disk Usage */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Disk Space</span>
            <div className="rounded-lg bg-purple-500/10 p-1.5 text-purple-400">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {system.disk.usagePercent}%
            </span>
            <span className="text-xs text-zinc-400">
              {diskUsedGb}/{diskTotalGb} GB
            </span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, system.disk.usagePercent)}%` }}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Free: {diskFreeGb} GB</span>
            <span className="font-mono text-[10px] text-zinc-400">ext4 NVMe</span>
          </div>
        </div>

        {/* 4. Load Average */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Load Average</span>
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {system.loadAvg.load1m}
            </span>
            <span className="text-xs text-zinc-500">1 min</span>
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-xs">
            <div className="text-zinc-400">
              <span className="text-zinc-500">5m:</span> {system.loadAvg.load5m}
            </div>
            <div className="text-zinc-400">
              <span className="text-zinc-500">15m:</span> {system.loadAvg.load15m}
            </div>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            Max capacity: {system.info.cpuCores}.00
          </div>
        </div>

        {/* 5. Network RX */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Network RX (In)</span>
            <div className="rounded-lg bg-cyan-500/10 p-1.5 text-cyan-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tracking-tight text-white">
              {system.network.rxFormatted}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{networkInterfaceLabel}</span>
            <MiniSparkline data={history.slice(-15).map((h) => h.networkRxKbps)} color="#06b6d4" />
          </div>
          <div className="mt-1 text-[10px] font-mono text-cyan-400/80">
            Incoming bandwidth
          </div>
        </div>

        {/* 6. Network TX */}
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Network TX (Out)</span>
            <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-xl font-bold tracking-tight text-white">
              {system.network.txFormatted}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{networkInterfaceLabel}</span>
            <MiniSparkline data={history.slice(-15).map((h) => h.networkTxKbps)} color="#818cf8" />
          </div>
          <div className="mt-1 text-[10px] font-mono text-indigo-400/80">
            Outgoing bandwidth
          </div>
        </div>
      </div>

      {/* 4 Hourly Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. CPU Usage Last Hour */}
        <AreaChart
          title="CPU Usage (Past 1 Hour)"
          subtitle={`Percentage load across ${system.info.cpuCores} virtual CPU cores`}
          data={cpuData}
          series1Name="CPU"
          series1Color="#10b981"
          unit="%"
          maxValue={100}
        />

        {/* 2. RAM Usage Last Hour */}
        <AreaChart
          title="Memory Usage (Past 1 Hour)"
          subtitle={`RAM consumption in percent of ${ramTotalGb} GB total`}
          data={ramData}
          series1Name="RAM"
          series1Color="#3b82f6"
          unit="%"
          maxValue={100}
        />

        {/* 3. Network Traffic RX / TX Last Hour */}
        <AreaChart
          title="Network Traffic (Past 1 Hour)"
          subtitle="Dual-channel RX & TX bandwidth in KB/s"
          data={netData}
          series1Name="RX (In)"
          series1Color="#06b6d4"
          series2Name="TX (Out)"
          series2Color="#a855f7"
          unit="KB/s"
        />

        {/* 4. Load Average Last Hour */}
        <AreaChart
          title="System Load Average (1m)"
          subtitle={`Kernel run-queue load relative to ${system.info.cpuCores}.00 capacity`}
          data={loadData}
          series1Name="Load 1m"
          series1Color="#f59e0b"
          maxValue={Math.max(...loadData.map((d) => d.value), 2.5)}
        />
      </div>

      {/* Quick Glance Row (Docker & Nginx Summary) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Docker Quick Glance */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Box className="h-4.5 w-4.5 text-emerald-400" />
              <h3 className="font-semibold text-zinc-100">Docker Containers</h3>
              <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                {docker ? `${docker.running}/${docker.total} Running` : '—'}
              </span>
            </div>
            <button
              onClick={() => onNavigate('docker')}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View all →
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {docker?.containers.map((container) => (
              <div
                key={container.id}
                className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-3.5 py-2.5 border border-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    {container.name}
                  </span>
                  <span className="hidden sm:inline font-mono text-[11px] text-zinc-500">
                    {container.image.split(':')[0]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-400">{container.memoryFormatted.split('/')[0].trim()}</span>
                  <StatusBadge status={container.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nginx & Web Traffic Quick Glance */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="font-semibold text-zinc-100">Nginx Web Server</h3>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-xs text-emerald-400">
                {nginx?.status.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <button
              onClick={() => onNavigate('nginx')}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View stats →
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3">
              <div className="text-[11px] text-zinc-500">Active Conns</div>
              <div className="font-mono text-lg font-bold text-white">
                {nginx?.activeConnections ?? '—'}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3">
              <div className="text-[11px] text-zinc-500">Req/sec</div>
              <div className="font-mono text-lg font-bold text-white">
                {nginx ? nginx.requestsPerSec : '—'}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3">
              <div className="text-[11px] text-zinc-500">2xx Success</div>
              <div className="font-mono text-lg font-bold text-emerald-400">
                {nginxSuccessRate}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3">
              <div className="text-[11px] text-zinc-500">Total Traffic</div>
              <div className="font-mono text-lg font-bold text-zinc-200">
                {nginx ? `${(nginx.totalTrafficBytes / (1024 * 1024 * 1024)).toFixed(1)} GB` : '—'}
              </div>
            </div>
          </div>

          {nginx?.topVirtualHosts && (
            <div className="mt-3 text-xs text-zinc-400">
              <span className="text-zinc-500">Top vHosts: </span>
              {nginx.topVirtualHosts.map((vh) => vh.serverName).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
