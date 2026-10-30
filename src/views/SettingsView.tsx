import React, { useState } from 'react';
import { HealthStatus } from '../types';
import {
  Settings,
  Server,
  RefreshCw,
  Palette,
  Radio,
  ShieldCheck,
  Cpu,
  Bot,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Code2
} from 'lucide-react';

interface SettingsViewProps {
  serverName: string;
  onServerNameChange: (name: string) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (interval: number) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  health: HealthStatus | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  serverName,
  onServerNameChange,
  refreshInterval,
  onRefreshIntervalChange,
  theme,
  onThemeChange,
  health
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [tempName, setTempName] = useState(serverName);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const dockerComposeSnippet = `version: '3.8'

services:
  server-control-center:
    build: .
    container_name: server-control-center
    restart: always
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - METRICS_PROVIDER=linux   # switch from mock to linux
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    volumes:
      # Mount host statistics in read-only mode:
      - /proc:/proc:ro
      - /sys:/sys:ro
      - /etc/os-release:/etc/os-release:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
`;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Settings Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">System & Dashboard Settings</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Configure local preferences, API polling frequency, and inspect provider architecture.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-6 backdrop-blur-sm">
        {/* Server Name */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <label className="text-sm font-semibold text-zinc-200">Server Display Name</label>
            <p className="text-xs text-zinc-400">
              Custom label shown in the top header and navigation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => onServerNameChange(tempName)}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-1.5 font-mono text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              placeholder="e.g. my-server"
            />
            <button
              onClick={() => onServerNameChange(tempName)}
              className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Save
            </button>
          </div>
        </div>

        {/* Refresh Interval */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <label className="text-sm font-semibold text-zinc-200">API Refresh Interval</label>
            <p className="text-xs text-zinc-400">
              How often the dashboard queries the backend for live telemetry.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {[2, 5, 10, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => onRefreshIntervalChange(sec)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                  refreshInterval === sec
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <label className="text-sm font-semibold text-zinc-200">Interface Theme</label>
            <p className="text-xs text-zinc-400">
              Color palette optimized for server operations and dark terminal environments.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            {[
              { id: 'dark', label: 'Dark Slate' },
              { id: 'oled', label: 'Midnight OLED' },
              { id: 'cyber', label: 'Cyber Matrix' }
            ].map((th) => (
              <button
                key={th.id}
                onClick={() => onThemeChange(th.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === th.id
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        {/* API Status & Health */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <label className="text-sm font-semibold text-zinc-200">Backend API Health</label>
            <p className="text-xs text-zinc-400">
              REST API endpoint `/api/health` status and active provider adapter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {health?.status.toUpperCase() || 'ONLINE'} (Mode: {health?.mode || 'mock'})
            </span>
          </div>
        </div>

        {/* Gemini Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-sm font-semibold text-zinc-200">Gemini AI Engine</label>
            <p className="text-xs text-zinc-400">
              Status of the server-side Gemini 3.8 Flash model connection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-semibold text-indigo-300">
              <Bot className="h-3.5 w-3.5" />
              {health?.geminiConfigured ? 'GEMINI CONNECTED' : 'INTELLIGENT DIAGNOSTIC FALLBACK ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Production Migration Guide (Mock -> Real Linux VPS) */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Code2 className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-zinc-100">
                Production Deployment: Switching Mock to Real Linux Provider
              </h3>
              <p className="text-xs text-zinc-400">
                How to connect this dashboard directly to your Ubuntu 24.04 VPS host metrics.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleCopy(dockerComposeSnippet, 'docker')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            {copiedCode === 'docker' ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy compose.yml</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-xs text-zinc-300 space-y-3">
          <p>
            The project adheres to a clean provider interface (<code className="text-emerald-400">SystemMetricsProvider</code>, <code className="text-emerald-400">DockerMetricsProvider</code>, etc.).
            To monitor real hardware and containers on Ubuntu 24.04:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-zinc-400">
            <li>
              Set <code className="text-zinc-200">METRICS_PROVIDER=linux</code> in your <code className="text-zinc-200">.env</code> or docker-compose file.
            </li>
            <li>
              Mount the host filesystem read-only: <code className="text-zinc-200">/proc</code>, <code className="text-zinc-200">/sys</code>, and <code className="text-zinc-200">/var/run/docker.sock</code> into the container.
            </li>
            <li>
              No frontend code needs to be modified; the exact same REST API contracts will serve the live host telemetry.
            </li>
          </ol>

          <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-300 leading-relaxed">
            {dockerComposeSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
