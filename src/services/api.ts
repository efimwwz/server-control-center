import {
  SystemMetrics,
  DockerOverview,
  NginxStats,
  SystemService,
  NetworkOverview,
  LogEntry,
  AiAnalyzeResponse,
  HealthStatus
} from '../types';

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getSystem(): Promise<SystemMetrics> {
    const res = await fetch('/api/system');
    if (!res.ok) throw new Error(`System metrics failed: ${res.statusText}`);
    return res.json();
  },

  async getDocker(): Promise<DockerOverview> {
    const res = await fetch('/api/docker');
    if (!res.ok) throw new Error(`Docker data failed: ${res.statusText}`);
    return res.json();
  },

  async getNginx(): Promise<NginxStats> {
    const res = await fetch('/api/nginx');
    if (!res.ok) throw new Error(`Nginx data failed: ${res.statusText}`);
    return res.json();
  },

  async getNetwork(): Promise<NetworkOverview> {
    const res = await fetch('/api/network');
    if (!res.ok) throw new Error(`Network data failed: ${res.statusText}`);
    return res.json();
  },

  async getServices(): Promise<SystemService[]> {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error(`Services data failed: ${res.statusText}`);
    return res.json();
  },

  async getLogs(options?: {
    source?: string;
    level?: string;
    query?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    const params = new URLSearchParams();
    if (options?.source && options.source !== 'all') params.append('source', options.source);
    if (options?.level && options.level !== 'all') params.append('level', options.level);
    if (options?.query) params.append('query', options.query);
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `/api/logs${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Logs data failed: ${res.statusText}`);
    return res.json();
  },

  async analyzeWithAi(question: string): Promise<AiAnalyzeResponse> {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `AI analyze failed: ${res.statusText}`);
    }
    return res.json();
  }
};
