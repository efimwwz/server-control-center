import React from 'react';
import {
  LayoutDashboard,
  Box,
  Globe,
  Layers,
  Network,
  Terminal,
  Bot,
  Settings,
  Shield,
  Activity
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'docker'
  | 'nginx'
  | 'services'
  | 'network'
  | 'logs'
  | 'ai'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  dockerCount?: number;
  nginxStatus?: string;
  hasErrors?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  dockerCount = 4,
  nginxStatus = 'active',
  hasErrors = false
}) => {
  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'docker', label: 'Docker', icon: Box, badge: `${dockerCount}`, badgeColor: 'bg-emerald-500/10 text-emerald-400' },
    { id: 'nginx', label: 'Nginx', icon: Globe, badge: nginxStatus.toUpperCase(), badgeColor: 'bg-emerald-500/10 text-emerald-400' },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'logs', label: 'Logs', icon: Terminal, badge: hasErrors ? 'ERR' : undefined, badgeColor: 'bg-rose-500/20 text-rose-400' },
    { id: 'ai', label: 'AI Assistant', icon: Bot, badge: 'Gemini', badgeColor: 'bg-indigo-500/20 text-indigo-300' },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800/80 bg-zinc-950 text-zinc-300 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800/80 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-950/50">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold tracking-tight text-white flex items-center gap-1.5">
            Server Control
          </div>
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            Ubuntu 24.04 LTS
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800/90 text-white shadow-sm ring-1 ring-zinc-700/60'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4.5 w-4.5 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Node Status */}
      <div className="border-t border-zinc-900 bg-zinc-950/60 p-4">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              Node Security
            </span>
            <span className="font-mono text-[11px] text-emerald-400">Hardened</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            UFW & Fail2ban active. Direct shell execution disabled.
          </div>
        </div>
      </div>
    </aside>
  );
};
