import React from 'react';
import { NginxStats } from '../types';
import { AreaChart, DataPoint } from '../components/Charts/AreaChart';
import { StatusBadge } from '../components/StatusBadge';
import {
  Globe,
  Radio,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Layers,
  ArrowDownUp
} from 'lucide-react';

interface NginxViewProps {
  nginx: NginxStats | null;
  onRefresh: () => void;
}

export const NginxView: React.FC<NginxViewProps> = ({ nginx }) => {
  if (!nginx) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span>Fetching Nginx web server metrics...</span>
        </div>
      </div>
    );
  }

  const reqChartData: DataPoint[] = nginx.requestHistory.map((pt) => ({
    label: pt.time,
    value: pt.requests,
    value2: pt.latencyMs
  }));

  const hasRequests = nginx.totalRequests > 0;
  const p2xx = hasRequests
    ? ((nginx.statusCodeCounts.code2xx / nginx.totalRequests) * 100).toFixed(1)
    : '—';
  const p3xx = hasRequests
    ? ((nginx.statusCodeCounts.code3xx / nginx.totalRequests) * 100).toFixed(1)
    : '—';
  const p4xx = hasRequests
    ? ((nginx.statusCodeCounts.code4xx / nginx.totalRequests) * 100).toFixed(1)
    : '—';
  const p5xx = hasRequests
    ? ((nginx.statusCodeCounts.code5xx / nginx.totalRequests) * 100).toFixed(2)
    : '—';

  const trafficGb = (nginx.totalTrafficBytes / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Top Nginx Identity Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-white">Nginx Web Server & Proxy</h2>
              <StatusBadge status={nginx.status} />
            </div>
            <div className="mt-1 flex items-center gap-3 font-mono text-xs text-zinc-400">
              <span>{nginx.version}</span>
              <span>•</span>
              <span>Uptime: {nginx.uptimeFormatted}</span>
              <span>•</span>
              <span className="text-emerald-400">{nginx.requestsPerSec} requests/sec</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-right">
            <div className="text-[11px] text-zinc-500">Traffic in Retained Logs</div>
            <div className="font-mono text-base font-bold text-white">{trafficGb} GB</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-right">
            <div className="text-[11px] text-zinc-500">Requests in Retained Logs</div>
            <div className="font-mono text-base font-bold text-cyan-400">
              {nginx.totalRequests.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Active Connections & Status Code Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Connections */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Active Connections</span>
            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          </div>
          {nginx.connectionStatsAvailable === false ? (
            <div className="mt-2">
              <div className="font-mono text-2xl font-bold text-amber-400">
                N/A
              </div>
              <div className="mt-3 border-t border-zinc-800/60 pt-2 text-xs text-amber-400">
                Nginx connection statistics unavailable
              </div>
              {nginx.connectionStatsError && (
                <div className="mt-1 break-words text-xs text-zinc-500">
                  {nginx.connectionStatsError}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mt-2 font-mono text-3xl font-bold text-white">
                {nginx.activeConnections}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-2 font-mono text-xs text-zinc-400">
                <span>Reading: {nginx.reading}</span>
                <span>Writing: {nginx.writing}</span>
                <span>Waiting: {nginx.waiting}</span>
              </div>
            </>
          )}
        </div>

        {/* 2xx Success */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              HTTP 2xx (Success)
            </span>
            <span className="font-mono text-xs font-semibold">{p2xx}%</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-emerald-400">
            {nginx.statusCodeCounts.code2xx.toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Healthy responses delivered to clients
          </div>
        </div>

        {/* 4xx Client Errors */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              HTTP 4xx (Client Errors)
            </span>
            <span className="font-mono text-xs font-semibold">{p4xx}%</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-amber-400">
            {nginx.statusCodeCounts.code4xx.toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            404s, scanner probes, unauthorized hits
          </div>
        </div>

        {/* 5xx Server Errors */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-rose-400">
            <span className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4" />
              HTTP 5xx (Server Errors)
            </span>
            <span className="font-mono text-xs font-semibold">{p5xx}%</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-rose-400">
            {nginx.statusCodeCounts.code5xx.toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Upstream timeout or connection drops
          </div>
        </div>
      </div>

      {/* Hourly Requests Graph */}
      <AreaChart
        title="Nginx Request Throughput (Past Hour)"
        subtitle="Requests served per minute and average latency (ms)"
        data={reqChartData}
        series1Name="Requests/min"
        series1Color="#06b6d4"
        series2Name="Latency (ms)"
        series2Color="#10b981"
        height={240}
      />

      {/* Reverse Proxy Virtual Hosts Table */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-cyan-400" />
            <h3 className="font-semibold text-zinc-100">Configured Virtual Hosts & Reverse Proxies</h3>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            {nginx.topVirtualHosts.length} Active Domains
          </span>
        </div>

        <div className="mt-4 divide-y divide-zinc-800/60">
          {nginx.topVirtualHosts.map((vh, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-zinc-100">{vh.serverName}</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-cyan-400">
                  :{vh.listenPort} (SSL)
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>Upstream:</span>
                  <span className="rounded bg-zinc-950 px-2 py-0.5 text-zinc-300 border border-zinc-800">
                    {vh.upstream}
                  </span>
                </div>
                <div className="text-zinc-400">
                  <span className="text-zinc-500">Hits: </span>
                  <span className="text-zinc-200">{vh.requests.toLocaleString()}</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Proxy OK
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
