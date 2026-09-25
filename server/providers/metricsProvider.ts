import {
  SystemMetrics,
  DockerOverview,
  NginxStats,
  SystemService,
  NetworkOverview,
  LogEntry
} from '../types.js';

export interface SystemMetricsProvider {
  getSystemMetrics(): Promise<SystemMetrics>;
}

export interface DockerMetricsProvider {
  getDockerOverview(): Promise<DockerOverview>;
}

export interface NginxMetricsProvider {
  getNginxStats(): Promise<NginxStats>;
}

export interface ServicesMetricsProvider {
  getServices(): Promise<SystemService[]>;
}

export interface NetworkMetricsProvider {
  getNetworkOverview(): Promise<NetworkOverview>;
}

export interface LogsProvider {
  getLogs(options?: {
    source?: 'all' | 'nginx' | 'docker' | 'systemd';
    level?: 'all' | 'info' | 'warning' | 'error';
    query?: string;
    limit?: number;
  }): Promise<LogEntry[]>;
}

export interface ProviderBundle {
  system: SystemMetricsProvider;
  docker: DockerMetricsProvider;
  nginx: NginxMetricsProvider;
  services: ServicesMetricsProvider;
  network: NetworkMetricsProvider;
  logs: LogsProvider;
}
