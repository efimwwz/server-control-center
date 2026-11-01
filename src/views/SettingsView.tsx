import React, { useState } from 'react';
import { HealthStatus } from '../types';
import { Bot, Copy, Check, Code2 } from 'lucide-react';

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

  const installCommand =
    'curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash';


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

      {/* Public one-command installer */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-4">
          <Code2 className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-zinc-100">Install Server Control Center</h3>
            <p className="text-xs text-zinc-400">
              Install the latest stable release on a new Ubuntu 24.04 VPS.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-xs text-zinc-300">
          <p>
            Run this command as an administrator on the server where you want to install the panel.
            The installer downloads a published GitHub Release archive, verifies its SHA256 checksum,
            installs Docker when needed, and starts the host agent and application.
          </p>
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-300">{installCommand}</pre>
            <button
              onClick={() => handleCopy(installCommand, 'install')}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              {copiedCode === 'install' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-zinc-400">
            <li>Supported target: Ubuntu 24.04 LTS with systemd.</li>
            <li>The web panel binds to 127.0.0.1:3000 and is not exposed directly to the internet.</li>
            <li>Use an SSH tunnel or configure your own HTTPS reverse proxy with authentication.</li>
            <li>The host agent runs as root to read system and Docker telemetry; review the security documentation first.</li>
          </ul>
        </div>
      </div>

    </div>
  );
};
