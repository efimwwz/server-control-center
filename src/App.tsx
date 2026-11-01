import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { DockerView } from './views/DockerView';
import { NginxView } from './views/NginxView';
import { ServicesView } from './views/ServicesView';
import { NetworkView } from './views/NetworkView';
import { LogsView } from './views/LogsView';
import { AiAssistantView } from './views/AiAssistantView';
import { SettingsView } from './views/SettingsView';
import { SecurityView } from './views/SecurityView';
import { api } from './services/api';
import {
  SystemMetrics,
  DockerOverview,
  NginxStats,
  SystemService,
  NetworkOverview,
  HealthStatus,
  SecurityOverview
} from './types';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data States
  const [system, setSystem] = useState<SystemMetrics | null>(null);
  const [docker, setDocker] = useState<DockerOverview | null>(null);
  const [nginx, setNginx] = useState<NginxStats | null>(null);
  const [services, setServices] = useState<SystemService[] | null>(null);
  const [network, setNetwork] = useState<NetworkOverview | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [security, setSecurity] = useState<SecurityOverview | null>(null);

  // App Settings States
  const [serverDisplayName, setServerDisplayName] = useState<string>(() => {
    const savedName = localStorage.getItem('scc_server_name');
    return savedName || '';
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('scc_refresh_interval') || '5', 10);
  });
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('scc_theme') || 'dark';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const refreshInProgress = useRef(false);

  const handleServerNameChange = (name: string) => {
    setServerDisplayName(name);
    localStorage.setItem('scc_server_name', name);
  };

  const handleRefreshIntervalChange = (sec: number) => {
    setRefreshInterval(sec);
    localStorage.setItem('scc_refresh_interval', sec.toString());
  };

  const handleThemeChange = (th: string) => {
    setTheme(th);
    localStorage.setItem('scc_theme', th);
  };

  // Fetch all live data
  const fetchData = useCallback(async () => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    try {
      setIsLoading(true);
      const [sysRes, docRes, ngxRes, srvRes, netRes, hltRes, secRes] = await Promise.allSettled([
        api.getSystem(),
        api.getDocker(),
        api.getNginx(),
        api.getServices(),
        api.getNetwork(),
        api.getHealth(),
        api.getSecurity()
      ]);

      if (sysRes.status === 'fulfilled') setSystem(sysRes.value);
      if (docRes.status === 'fulfilled') setDocker(docRes.value);
      if (ngxRes.status === 'fulfilled') setNginx(ngxRes.value);
      if (srvRes.status === 'fulfilled') setServices(srvRes.value);
      if (netRes.status === 'fulfilled') setNetwork(netRes.value);
      if (hltRes.status === 'fulfilled') setHealth(hltRes.value);
      if (secRes.status === 'fulfilled') setSecurity(secRes.value);

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to fetch monitoring metrics:', err);
    } finally {
      refreshInProgress.current = false;
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh interval
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const themeClass =
    theme === 'oled'
      ? 'bg-black text-zinc-100'
      : theme === 'cyber'
      ? 'bg-zinc-950 text-emerald-100 font-mono-accents'
      : 'bg-zinc-950 text-zinc-100';

  return (
    <div className={`flex min-h-screen ${themeClass} antialiased`}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dockerCount={docker?.running ?? 4}
          nginxStatus={nginx?.status ?? 'active'}
          securityStatus={security?.status ?? 'unknown'}
          securitySummary={security?.summary}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72">
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              dockerCount={docker?.running ?? 4}
              nginxStatus={nginx?.status ?? 'active'}
              securityStatus={security?.status ?? 'unknown'}
              securitySummary={security?.summary}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Nav Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="font-bold text-white">Server Control Center</div>
          <div className="h-6 w-6" />
        </div>

        {/* Global System Header */}
        <Header
          systemInfo={system?.info || null}
          isLoading={isLoading}
          onRefresh={fetchData}
          lastRefreshedAt={lastRefreshedAt}
          serverDisplayName={serverDisplayName}
          refreshIntervalSeconds={refreshInterval}
        />

        {/* View Port Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              system={system}
              docker={docker}
              nginx={nginx}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'docker' && (
            <DockerView docker={docker} onRefresh={fetchData} />
          )}

          {activeTab === 'nginx' && (
            <NginxView nginx={nginx} onRefresh={fetchData} />
          )}

          {activeTab === 'services' && (
            <ServicesView services={services} onRefresh={fetchData} />
          )}

          {activeTab === 'network' && (
            <NetworkView network={network} onRefresh={fetchData} />
          )}

          {activeTab === 'security' && (
            <SecurityView security={security} onRefresh={fetchData} />
          )}

          {activeTab === 'logs' && <LogsView />}

          {activeTab === 'ai' && (
            <AiAssistantView system={system} docker={docker} nginx={nginx} />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              serverName={serverDisplayName}
              onServerNameChange={handleServerNameChange}
              refreshInterval={refreshInterval}
              onRefreshIntervalChange={handleRefreshIntervalChange}
              theme={theme}
              onThemeChange={handleThemeChange}
              health={health}
            />
          )}
        </main>
      </div>
    </div>
  );
}
