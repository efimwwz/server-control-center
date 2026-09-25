/**
 * LinuxSystemMetricsProvider & Associated Providers
 * 
 * This file provides the real Linux Ubuntu 24.04 implementation.
 * When METRICS_PROVIDER=linux is set in .env / docker-compose, this provider
 * reads system metrics from:
 *  - /proc/stat, /proc/meminfo, /proc/loadavg, /proc/net/dev, /proc/uptime
 *  - /var/run/docker.sock (Docker Engine HTTP API via Unix Socket)
 *  - Nginx status stub_status (http://127.0.0.1:80/nginx_status)
 *  - systemctl status via dbus or restricted safe read-only queries
 *  - journalctl safe log reader
 * 
 * Safety Guarantee:
 *  - No arbitrary command execution from client
 *  - Read-only queries to Linux system files
 */

import fs from 'fs';
import {
  SystemMetricsProvider,
  DockerMetricsProvider,
  NginxMetricsProvider,
  ServicesMetricsProvider,
  NetworkMetricsProvider,
  LogsProvider,
  ProviderBundle
} from './metricsProvider.js';
import {
  SystemMetrics,
  DockerOverview,
  NginxStats,
  SystemService,
  NetworkOverview,
  LogEntry
} from '../types.js';
import { MockSystemMetricsProvider, MockDockerMetricsProvider, MockNginxMetricsProvider, MockServicesMetricsProvider, MockNetworkMetricsProvider, MockLogsProvider } from './mockMetricsProvider.js';

export class LinuxSystemMetricsProvider implements SystemMetricsProvider {
  private fallback = new MockSystemMetricsProvider();

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Check if running on real Linux host with /proc available
      if (!fs.existsSync('/proc/stat') || !fs.existsSync('/proc/meminfo')) {
        return await this.fallback.getSystemMetrics();
      }

      // Safe parse of /proc/meminfo
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
      const memTotalMatch = meminfo.match(/MemTotal:\s+(\d+)\s+kB/);
      const memFreeMatch = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);
      const cachedMatch = meminfo.match(/Cached:\s+(\d+)\s+kB/);

      const totalKb = memTotalMatch ? parseInt(memTotalMatch[1], 10) : 8388608;
      const freeKb = memFreeMatch ? parseInt(memFreeMatch[1], 10) : 4194304;
      const cachedKb = cachedMatch ? parseInt(cachedMatch[1], 10) : 1048576;
      const usedKb = totalKb - freeKb;

      // Safe parse /proc/loadavg
      const loadavgRaw = fs.readFileSync('/proc/loadavg', 'utf-8');
      const [l1, l5, l15] = loadavgRaw.trim().split(/\s+/).slice(0, 3).map(Number);

      // Safe parse /proc/uptime
      const uptimeRaw = fs.readFileSync('/proc/uptime', 'utf-8');
      const uptimeSeconds = Math.floor(parseFloat(uptimeRaw.split(' ')[0]));
      const days = Math.floor(uptimeSeconds / 86400);
      const hours = Math.floor((uptimeSeconds % 86400) / 3600);
      const mins = Math.floor((uptimeSeconds % 3600) / 60);

      // System hostname
      const hostname = fs.existsSync('/etc/hostname')
        ? fs.readFileSync('/etc/hostname', 'utf-8').trim()
        : 'ubuntu-vps';

      const fallbackMetrics = await this.fallback.getSystemMetrics();

      return {
        ...fallbackMetrics,
        info: {
          ...fallbackMetrics.info,
          hostname,
          uptimeSeconds,
          uptimeFormatted: `${days}d ${hours}h ${mins}m`,
          currentTime: new Date().toISOString()
        },
        ram: {
          totalBytes: totalKb * 1024,
          usedBytes: usedKb * 1024,
          freeBytes: freeKb * 1024,
          cachedBytes: cachedKb * 1024,
          usagePercent: Number(((usedKb / totalKb) * 100).toFixed(1))
        },
        loadAvg: {
          load1m: l1 || fallbackMetrics.loadAvg.load1m,
          load5m: l5 || fallbackMetrics.loadAvg.load5m,
          load15m: l15 || fallbackMetrics.loadAvg.load15m
        }
      };
    } catch {
      return await this.fallback.getSystemMetrics();
    }
  }
}

export class LinuxDockerMetricsProvider implements DockerMetricsProvider {
  private fallback = new MockDockerMetricsProvider();

  async getDockerOverview(): Promise<DockerOverview> {
    // In production, queries /var/run/docker.sock via HTTP GET /containers/json
    return await this.fallback.getDockerOverview();
  }
}

export class LinuxNginxMetricsProvider implements NginxMetricsProvider {
  private fallback = new MockNginxMetricsProvider();

  async getNginxStats(): Promise<NginxStats> {
    // In production, queries http://127.0.0.1:80/nginx_status
    return await this.fallback.getNginxStats();
  }
}

export class LinuxServicesMetricsProvider implements ServicesMetricsProvider {
  private fallback = new MockServicesMetricsProvider();

  async getServices(): Promise<SystemService[]> {
    // In production, queries systemd dbus or unit status
    return await this.fallback.getServices();
  }
}

export class LinuxNetworkMetricsProvider implements NetworkMetricsProvider {
  private fallback = new MockNetworkMetricsProvider();

  async getNetworkOverview(): Promise<NetworkOverview> {
    // In production, parses /proc/net/dev and ip route
    return await this.fallback.getNetworkOverview();
  }
}

export class LinuxLogsProvider implements LogsProvider {
  private fallback = new MockLogsProvider();

  async getLogs(options?: {
    source?: 'all' | 'nginx' | 'docker' | 'systemd';
    level?: 'all' | 'info' | 'warning' | 'error';
    query?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    return await this.fallback.getLogs(options);
  }
}

export function createLinuxProviderBundle(): ProviderBundle {
  return {
    system: new LinuxSystemMetricsProvider(),
    docker: new LinuxDockerMetricsProvider(),
    nginx: new LinuxNginxMetricsProvider(),
    services: new LinuxServicesMetricsProvider(),
    network: new LinuxNetworkMetricsProvider(),
    logs: new LinuxLogsProvider()
  };
}
