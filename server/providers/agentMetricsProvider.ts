import http from 'http';

import {
  SystemMetricsProvider,
  DockerMetricsProvider,
  NginxMetricsProvider,
  ServicesMetricsProvider,
  NetworkMetricsProvider,
  LogsProvider,
  ProviderBundle,
} from './metricsProvider.js';

import {
  SystemMetrics,
  DockerOverview,
  NginxStats,
  SystemService,
  NetworkOverview,
  LogEntry,
  MetricHistoryPoint,
  SecurityOverview,
} from '../types.js';

const SOCKET_PATH =
  process.env.SCC_AGENT_SOCKET || '/run/scc-agent/agent.sock';

function agentGet<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path,
        method: 'GET',
        headers: {
          Connection: 'close',
        },
      },
      (res) => {
        let body = '';

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(
              new Error(
                `SCC agent ${path} returned HTTP ${res.statusCode}: ${body.slice(
                  0,
                  300,
                )}`,
              ),
            );
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            reject(
              new Error(
                `Invalid JSON from SCC agent ${path}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              ),
            );
          }
        });
      },
    );

    req.setTimeout(5000, () => {
      req.destroy(new Error(`SCC agent timeout: ${path}`));
    });

    req.on('error', reject);
    req.end();
  });
}

export class AgentSystemMetricsProvider
  implements SystemMetricsProvider
{
  private history: MetricHistoryPoint[] = [];

  async getSystemMetrics(): Promise<SystemMetrics> {
    const data = await agentGet<SystemMetrics>('/system');

    const timestamp = Date.now();

    this.history.push({
      time: new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp,
      cpu: data.cpu.usagePercent,
      ram: data.ram.usagePercent,
      networkRxKbps: Math.round(data.network.rxBytesSec / 1024),
      networkTxKbps: Math.round(data.network.txBytesSec / 1024),
      load1m: data.loadAvg.load1m,
    });

    if (this.history.length > 60) {
      this.history = this.history.slice(-60);
    }

    return {
      ...data,
      history: [...this.history],
    };
  }
}

export class AgentDockerMetricsProvider
  implements DockerMetricsProvider
{
  async getDockerOverview(): Promise<DockerOverview> {
    return agentGet<DockerOverview>('/docker');
  }
}

export class AgentNginxMetricsProvider
  implements NginxMetricsProvider {
  async getNginxStats(): Promise<NginxStats> {
    return agentGet<NginxStats>('/nginx');
  }
}

export class AgentServicesMetricsProvider
  implements ServicesMetricsProvider {
  async getServices(): Promise<SystemService[]> {
    return agentGet<SystemService[]>('/services');
  }
}

export class AgentNetworkMetricsProvider
  implements NetworkMetricsProvider {
  async getNetworkOverview(): Promise<NetworkOverview> {
    return agentGet<NetworkOverview>('/network');
  }
}

export class AgentLogsProvider implements LogsProvider {
  async getLogs(options?: {
    source?: 'all' | 'nginx' | 'docker' | 'systemd';
    level?: 'all' | 'info' | 'warning' | 'error';
    query?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    const params = new URLSearchParams();
    params.set('source', options?.source ?? 'all');
    params.set('level', options?.level ?? 'all');
    params.set('limit', String(options?.limit ?? 100));

    if (options?.query) {
      params.set('query', options.query.slice(0, 100));
    }

    return agentGet<LogEntry[]>(`/logs?${params.toString()}`);
  }
}

export function createAgentProviderBundle(): ProviderBundle {
  /*
   * Real providers currently implemented by scc-agent:
   *   system
   *   docker
   *
   * The remaining providers will be connected separately.
   * Do not silently substitute mock values here.
   */
  throw new Error(
    'Agent provider bundle requires full provider integration',
  );
}

export class AgentSecurityMetricsProvider {
  async getSecurityOverview(): Promise<SecurityOverview> {
    return agentGet<SecurityOverview>('/security');
  }
}
