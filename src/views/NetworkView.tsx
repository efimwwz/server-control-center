import React, { useState } from 'react';
import { NetworkOverview } from '../types';
import {
  Network,
  Globe,
  Radio,
  Wifi,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Server,
  Layers
} from 'lucide-react';

interface NetworkViewProps {
  network: NetworkOverview | null;
  onRefresh: () => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ network }) => {
  const [copiedIp, setCopiedIp] = useState(false);

  if (!network) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Fetching network interfaces...</span>
        </div>
      </div>
    );
  }

  const handleCopyIp = () => {
    navigator.clipboard.writeText(network.publicIp);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const formatTraffic = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Network Overview Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Public IP */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Public IPv4 Address</span>
            <Globe className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-white tracking-wide">
              {network.publicIp}
            </span>
            <button
              onClick={handleCopyIp}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              title="Copy Public IP"
            >
              {copiedIp ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Frankfurt, Germany (VirtIO)</div>
        </div>

        {/* Default Gateway */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Default Gateway</span>
            <Radio className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-white tracking-wide">
            {network.defaultGateway}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Next-hop router</div>
        </div>

        {/* Latency / Ping */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Network Latency (RTT)</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {network.latencyMs} ms
            </span>
            <span className="text-xs text-zinc-500">Loss: {network.packetLossPercent}%</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500 truncate" title={network.pingTarget}>
            Target: {network.pingTarget}
          </div>
        </div>

        {/* DNS Servers */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Configured DNS Resolvers</span>
            <Wifi className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 font-mono text-sm font-semibold text-zinc-200">
            {network.dnsServers.join(', ')}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">Cloudflare & Google Anycast</div>
        </div>
      </div>

      {/* Live RX / TX Gauges */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Live Inbound Rate (RX)</h3>
                <div className="text-xs text-zinc-400">Incoming network payload</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-cyan-400">
                {network.rxSpeedFormatted}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Live Outbound Rate (TX)</h3>
                <div className="text-xs text-zinc-400">Outgoing network payload</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-indigo-400">
                {network.txSpeedFormatted}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Interfaces Table */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-emerald-400" />
            <h3 className="font-semibold text-zinc-100">Network Interfaces & Hardware</h3>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            {network.interfaces.length} Interfaces Active
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm font-mono text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5">Interface</th>
                <th className="py-2.5">Type</th>
                <th className="py-2.5">State</th>
                <th className="py-2.5">IPv4 Address</th>
                <th className="py-2.5">MAC / MTU</th>
                <th className="py-2.5">Total RX</th>
                <th className="py-2.5">Total TX</th>
                <th className="py-2.5 text-right">Speed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {network.interfaces.map((iface) => (
                <tr key={iface.name} className="hover:bg-zinc-800/30">
                  <td className="py-3 font-bold text-zinc-100">{iface.name}</td>
                  <td className="py-3 text-zinc-400 capitalize">{iface.type}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {iface.state}
                    </span>
                  </td>
                  <td className="py-3 text-cyan-300 font-semibold">{iface.ipv4}</td>
                  <td className="py-3 text-zinc-400">
                    <div>{iface.mac}</div>
                    <div className="text-[10px] text-zinc-500">MTU: {iface.mtu}</div>
                  </td>
                  <td className="py-3 text-zinc-200">
                    <div>{formatTraffic(iface.rxBytes)}</div>
                    <div className="text-[10px] text-zinc-500">{iface.rxPackets.toLocaleString()} pkts</div>
                  </td>
                  <td className="py-3 text-zinc-200">
                    <div>{formatTraffic(iface.txBytes)}</div>
                    <div className="text-[10px] text-zinc-500">{iface.txPackets.toLocaleString()} pkts</div>
                  </td>
                  <td className="py-3 text-right text-zinc-300 font-sans text-xs">
                    {iface.speed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
