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
  DockerContainer,
  NginxStats,
  SystemService,
  NetworkOverview,
  LogEntry,
  MetricHistoryPoint
} from '../types.js';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export class MockSystemMetricsProvider implements SystemMetricsProvider {
  private startTime = Date.now() - 14 * 24 * 3600 * 1000 - 6 * 3600 * 1000 - 24 * 60 * 1000;

  async getSystemMetrics(): Promise<SystemMetrics> {
    const now = Date.now();
    const uptimeSec = Math.floor((now - this.startTime) / 1000);
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);

    // Realistic natural fluctuations
    const jitter = Math.sin(now / 15000) * 8 + Math.cos(now / 7000) * 4;
    const baseCpu = 24.5;
    const cpuUsage = Math.min(95, Math.max(8, Number((baseCpu + jitter).toFixed(1))));
    const userPercent = Number((cpuUsage * 0.75).toFixed(1));
    const systemPercent = Number((cpuUsage * 0.25).toFixed(1));
    const idlePercent = Number((100 - cpuUsage).toFixed(1));

    const totalRam = 8 * 1024 * 1024 * 1024; // 8GB
    const ramJitter = Math.sin(now / 25000) * 150 * 1024 * 1024;
    const usedRam = 4.15 * 1024 * 1024 * 1024 + ramJitter;
    const freeRam = totalRam - usedRam;
    const cachedRam = 1.8 * 1024 * 1024 * 1024;
    const ramUsagePercent = Number(((usedRam / totalRam) * 100).toFixed(1));

    const totalDisk = 160 * 1024 * 1024 * 1024; // 160GB NVMe
    const usedDisk = 43.8 * 1024 * 1024 * 1024;
    const freeDisk = totalDisk - usedDisk;
    const diskUsagePercent = Number(((usedDisk / totalDisk) * 100).toFixed(1));

    const rxSpeed = Math.max(120000, 1850000 + Math.sin(now / 8000) * 600000);
    const txSpeed = Math.max(250000, 3420000 + Math.cos(now / 9000) * 950000);

    // Generate 60 history points (1 per minute for the last hour)
    const history: MetricHistoryPoint[] = [];
    for (let i = 59; i >= 0; i--) {
      const pointTime = new Date(now - i * 60 * 1000);
      const t = pointTime.getTime();
      const wave = Math.sin(t / 600000) * 12 + Math.cos(t / 240000) * 6;
      const ptCpu = Math.min(90, Math.max(12, Number((26 + wave).toFixed(1))));
      const ptRam = Math.min(85, Math.max(45, Number((51 + Math.sin(t / 900000) * 4).toFixed(1))));
      const ptRx = Math.max(50, Math.round(1800 + Math.sin(t / 400000) * 800));
      const ptTx = Math.max(120, Math.round(3400 + Math.cos(t / 500000) * 1200));
      const ptLoad = Number((0.55 + ptCpu / 60).toFixed(2));

      history.push({
        time: pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: t,
        cpu: ptCpu,
        ram: ptRam,
        networkRxKbps: ptRx,
        networkTxKbps: ptTx,
        load1m: ptLoad
      });
    }

    return {
      info: {
        hostname: 'example-vps.local',
        os: 'Ubuntu 24.04.1 LTS (Noble Numbat)',
        kernel: 'Linux 6.8.0-45-generic x86_64',
        uptimeSeconds: uptimeSec,
        uptimeFormatted: `${days}d ${hours}h ${mins}m`,
        currentTime: new Date().toISOString(),
        status: cpuUsage > 85 ? 'warning' : 'online',
        cpuCores: 4,
        cpuModel: 'AMD EPYC 7763 64-Core Processor (4 vCPU)'
      },
      cpu: {
        usagePercent: cpuUsage,
        userPercent,
        systemPercent,
        idlePercent,
        temperatureC: 41.5
      },
      ram: {
        totalBytes: totalRam,
        usedBytes: Math.round(usedRam),
        freeBytes: Math.round(freeRam),
        cachedBytes: cachedRam,
        usagePercent: ramUsagePercent
      },
      disk: {
        totalBytes: totalDisk,
        usedBytes: usedDisk,
        freeBytes: freeDisk,
        usagePercent: diskUsagePercent,
        mountPoint: '/',
        filesystem: '/dev/nvme0n1p2 (ext4)'
      },
      loadAvg: {
        load1m: Number((0.68 + (cpuUsage - 20) / 70).toFixed(2)),
        load5m: 0.74,
        load15m: 0.62
      },
      network: {
        rxBytesSec: Math.round(rxSpeed),
        txBytesSec: Math.round(txSpeed),
        rxFormatted: formatSpeed(rxSpeed),
        txFormatted: formatSpeed(txSpeed)
      },
      history
    };
  }
}

export class MockDockerMetricsProvider implements DockerMetricsProvider {
  async getDockerOverview(): Promise<DockerOverview> {
    const containers: DockerContainer[] = [
      {
        id: 'c8f7d912a101',
        name: 'web',
        image: 'nginx:stable-alpine',
        status: 'UP',
        statusDetail: 'Up 14 days (healthy)',
        uptime: '14 days',
        cpuPercent: 1.4,
        memoryUsageBytes: 92 * 1024 * 1024,
        memoryLimitBytes: 8192 * 1024 * 1024,
        memoryFormatted: '92 MB / 8.0 GB',
        ports: ['127.0.0.1:8080->80/tcp'],
        created: '2026-09-11 04:12:00',
        restartCount: 0,
        command: 'nginx -g daemon off;'
      },
      {
        id: 'a4b1e890c202',
        name: 'worker',
        image: 'node:22-alpine',
        status: 'UP',
        statusDetail: 'Up 9 days',
        uptime: '9 days',
        cpuPercent: 3.8,
        memoryUsageBytes: 348 * 1024 * 1024,
        memoryLimitBytes: 8192 * 1024 * 1024,
        memoryFormatted: '348 MB / 8.0 GB',
        ports: ['127.0.0.1:8081->3000/tcp'],
        created: '2026-09-16 11:35:12',
        restartCount: 0,
        command: 'node server.js'
      },
      {
        id: 'e3c9d745f303',
        name: 'database',
        image: 'postgres:16-alpine',
        status: 'UP',
        statusDetail: 'Up 14 days',
        uptime: '14 days',
        cpuPercent: 2.2,
        memoryUsageBytes: 425 * 1024 * 1024,
        memoryLimitBytes: 8192 * 1024 * 1024,
        memoryFormatted: '425 MB / 8.0 GB',
        ports: ['127.0.0.1:5432->5432/tcp'],
        created: '2026-09-11 04:15:30',
        restartCount: 0,
        command: 'postgres'
      },
      {
        id: 'b7a2d109f404',
        name: 'cache',
        image: 'redis:7-alpine',
        status: 'UP',
        statusDetail: 'Up 14 days',
        uptime: '14 days',
        cpuPercent: 0.9,
        memoryUsageBytes: 98 * 1024 * 1024,
        memoryLimitBytes: 8192 * 1024 * 1024,
        memoryFormatted: '98 MB / 8.0 GB',
        ports: ['127.0.0.1:6379->6379/tcp'],
        created: '2026-09-11 04:18:00',
        restartCount: 0,
        command: 'redis-server'
      }
    ];

    return {
      total: containers.length,
      running: containers.filter((c) => c.status === 'UP').length,
      stopped: containers.filter((c) => c.status === 'STOPPED').length,
      restarting: containers.filter((c) => c.status === 'RESTARTING').length,
      error: containers.filter((c) => c.status === 'ERROR').length,
      containers,
      engineVersion: 'Docker Engine v27.2.0 (Ubuntu 24.04)'
    };
  }
}

export class MockNginxMetricsProvider implements NginxMetricsProvider {
  async getNginxStats(): Promise<NginxStats> {
    const now = Date.now();
    const reqHistory = [];
    for (let i = 24; i >= 0; i--) {
      const t = new Date(now - i * 150000);
      const reqCount = Math.round(380 + Math.sin(t.getTime() / 600000) * 120 + Math.random() * 40);
      reqHistory.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requests: reqCount,
        latencyMs: Number((4.2 + Math.random() * 2.1).toFixed(1))
      });
    }

    return {
      status: 'active',
      version: 'nginx/1.24.0 (Ubuntu Noble)',
      uptimeFormatted: '14 days 6 hours',
      activeConnections: 42,
      reading: 2,
      writing: 8,
      waiting: 32,
      totalRequests: 1489210,
      totalTrafficBytes: 31548201984, // ~29.4 GB
      requestsPerSec: 18.4,
      statusCodeCounts: {
        code2xx: 1421080,
        code3xx: 48940,
        code4xx: 15180,
        code5xx: 4010
      },
      requestHistory: reqHistory,
      topVirtualHosts: [
        {
          serverName: 'app.example.test',
          listenPort: 443,
          upstream: 'http://127.0.0.1:5678',
          requests: 842100,
          status: 'healthy'
        },
        {
          serverName: 'api.example.test',
          listenPort: 443,
          upstream: 'http://127.0.0.1:2053',
          requests: 382400,
          status: 'healthy'
        },
        {
          serverName: 'admin.example.test',
          listenPort: 443,
          upstream: 'http://127.0.0.1:8123',
          requests: 219800,
          status: 'healthy'
        },
        {
          serverName: 'status.example.test',
          listenPort: 443,
          upstream: 'http://127.0.0.1:61208',
          requests: 44910,
          status: 'healthy'
        }
      ]
    };
  }
}

export class MockServicesMetricsProvider implements ServicesMetricsProvider {
  async getServices(): Promise<SystemService[]> {
    return [
      {
        name: 'nginx',
        unitName: 'nginx.service',
        active: true,
        status: 'active',
        subStatus: 'running',
        uptime: '14 days 6 hours',
        pid: 1204,
        memoryBytes: 46 * 1024 * 1024,
        memoryFormatted: '46.2 MB',
        description: 'A high performance web server and reverse proxy server',
        enabledOnBoot: true
      },
      {
        name: 'docker',
        unitName: 'docker.service',
        active: true,
        status: 'active',
        subStatus: 'running',
        uptime: '14 days 6 hours',
        pid: 1148,
        memoryBytes: 112 * 1024 * 1024,
        memoryFormatted: '112.4 MB',
        description: 'Docker Application Container Engine',
        enabledOnBoot: true
      },
      {
        name: 'ssh',
        unitName: 'ssh.service',
        active: true,
        status: 'active',
        subStatus: 'running',
        uptime: '14 days 6 hours',
        pid: 982,
        memoryBytes: 14 * 1024 * 1024,
        memoryFormatted: '14.1 MB',
        description: 'OpenBSD Secure Shell server',
        enabledOnBoot: true
      },
      {
        name: 'cron',
        unitName: 'cron.service',
        active: true,
        status: 'active',
        subStatus: 'running',
        uptime: '14 days 6 hours',
        pid: 974,
        memoryBytes: 6 * 1024 * 1024,
        memoryFormatted: '5.8 MB',
        description: 'Regular background program processing daemon',
        enabledOnBoot: true
      },
      {
        name: 'systemd-resolved',
        unitName: 'systemd-resolved.service',
        active: true,
        status: 'active',
        subStatus: 'running',
        uptime: '14 days 6 hours',
        pid: 845,
        memoryBytes: 18 * 1024 * 1024,
        memoryFormatted: '18.3 MB',
        description: 'Network Name Resolution Service',
        enabledOnBoot: true
      },
      {
        name: 'fail2ban',
        unitName: 'fail2ban.service',
        active: true,
        status: 'active',
        subStatus: 'running',
        uptime: '14 days 6 hours',
        pid: 1312,
        memoryBytes: 28 * 1024 * 1024,
        memoryFormatted: '28.0 MB',
        description: 'Crash ban service for brute-force attack prevention',
        enabledOnBoot: true
      }
    ];
  }
}

export class MockNetworkMetricsProvider implements NetworkMetricsProvider {
  async getNetworkOverview(): Promise<NetworkOverview> {
    const now = Date.now();
    const rxSpeed = Math.round(1850000 + Math.sin(now / 8000) * 400000);
    const txSpeed = Math.round(3420000 + Math.cos(now / 9000) * 600000);

    return {
      publicIp: '203.0.113.10',
      hostname: 'example-vps.local',
      defaultGateway: '203.0.113.1',
      dnsServers: ['1.1.1.1', '8.8.8.8', '1.0.0.1'],
      interfaces: [
        {
          name: 'eth0',
          type: 'ethernet',
          state: 'UP',
          ipv4: '203.0.113.10',
          netmask: '255.255.255.0',
          mac: '02:00:00:00:00:10',
          mtu: 1500,
          rxBytes: 198421098420,
          txBytes: 412098231049,
          rxPackets: 182410294,
          txPackets: 294019284,
          rxErrors: 0,
          txErrors: 0,
          speed: '10000 Mbit/s (10G VirtIO)'
        },
        {
          name: 'docker0',
          type: 'bridge',
          state: 'UP',
          ipv4: '172.17.0.1',
          netmask: '255.255.0.0',
          mac: '02:00:00:00:00:20',
          mtu: 1500,
          rxBytes: 94810294020,
          txBytes: 89410294020,
          rxPackets: 71201948,
          txPackets: 69810294,
          rxErrors: 0,
          txErrors: 0,
          speed: 'Software Bridge'
        },
        {
          name: 'lo',
          type: 'loopback',
          state: 'UP',
          ipv4: '127.0.0.1',
          netmask: '255.0.0.0',
          mac: '00:00:00:00:00:00',
          mtu: 65536,
          rxBytes: 14210492810,
          txBytes: 14210492810,
          rxPackets: 14029481,
          txPackets: 14029481,
          rxErrors: 0,
          txErrors: 0,
          speed: 'Virtual Loopback'
        }
      ],
      rxSpeedBytesSec: rxSpeed,
      txSpeedBytesSec: txSpeed,
      rxSpeedFormatted: formatSpeed(rxSpeed),
      txSpeedFormatted: formatSpeed(txSpeed),
      packetLossPercent: 0.0,
      latencyMs: Number((13.8 + Math.random() * 1.5).toFixed(1)),
      pingTarget: '1.1.1.1 (public DNS resolver)'
    };
  }
}

export class MockLogsProvider implements LogsProvider {
  private baseLogs: LogEntry[] = [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 45 * 1000).toISOString(),
      source: 'nginx',
      level: 'info',
      service: 'nginx.service',
      message: '203.0.113.42 - - [25/Sep/2026:16:24:12 +0000] "GET /api/v1/workflows HTTP/2.0" 200 4812 "https://app.example.test" "Mozilla/5.0"',
      details: { status: 200, latency: '12ms' }
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 95 * 1000).toISOString(),
      source: 'docker',
      level: 'info',
      service: 'worker',
      message: 'Background job completed successfully.',
      details: { workflowId: 41, status: 'success' }
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 140 * 1000).toISOString(),
      source: 'docker',
      level: 'info',
      service: 'database',
      message: 'Database maintenance completed successfully.',
      details: { component: 'database' }
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 180 * 1000).toISOString(),
      source: 'systemd',
      level: 'info',
      service: 'cron.service',
      message: '(root) CMD (test -x /usr/sbin/anacron || { cd / && run-parts --report /etc/cron.daily; })',
      details: { user: 'root' }
    },
    {
      id: 'log-5',
      timestamp: new Date(Date.now() - 250 * 1000).toISOString(),
      source: 'nginx',
      level: 'warning',
      service: 'nginx.service',
      message: '198.51.100.22 - - [25/Sep/2026:16:20:45 +0000] "GET /wp-login.php HTTP/1.1" 404 162 "-" "Mozilla/5.0 scanner"',
      details: { status: 404, blocked: false }
    },
    {
      id: 'log-6',
      timestamp: new Date(Date.now() - 320 * 1000).toISOString(),
      source: 'docker',
      level: 'info',
      service: 'web',
      message: 'Application request authenticated successfully.',
      details: { component: 'web' }
    },
    {
      id: 'log-7',
      timestamp: new Date(Date.now() - 410 * 1000).toISOString(),
      source: 'systemd',
      level: 'warning',
      service: 'fail2ban.service',
      message: '[sshd] Ban 198.51.100.11 after 5 failed authentication attempts',
      details: { jail: 'sshd', ip: '198.51.100.11' }
    },
    {
      id: 'log-8',
      timestamp: new Date(Date.now() - 520 * 1000).toISOString(),
      source: 'nginx',
      level: 'error',
      service: 'nginx.service',
      message: '[error] 1204#1204: *49120 SSL_do_handshake() failed (SSL: error:0A0000C1:SSL routines::no shared cipher) while SSL handshaking, client: 203.0.113.42',
      details: { sslError: 'no shared cipher' }
    },
    {
      id: 'log-9',
      timestamp: new Date(Date.now() - 680 * 1000).toISOString(),
      source: 'docker',
      level: 'info',
      service: 'cache',
      message: 'Health endpoint polled by local monitoring client, 200 OK',
      details: { endpoint: '/api/3/quicklook' }
    },
    {
      id: 'log-10',
      timestamp: new Date(Date.now() - 900 * 1000).toISOString(),
      source: 'systemd',
      level: 'info',
      service: 'ssh.service',
      message: 'Accepted public-key authentication for operator from 203.0.113.70 port 54120 ssh2.',
      details: { user: 'admin', auth: 'publickey' }
    },
    {
      id: 'log-11',
      timestamp: new Date(Date.now() - 1200 * 1000).toISOString(),
      source: 'nginx',
      level: 'info',
      service: 'nginx.service',
      message: 'Configuration syntax test /etc/nginx/nginx.conf successful',
      details: { configStatus: 'ok' }
    },
    {
      id: 'log-12',
      timestamp: new Date(Date.now() - 1500 * 1000).toISOString(),
      source: 'docker',
      level: 'warning',
      service: 'homeassistant',
      message: 'A monitored sensor took longer than 10.0 seconds to update (timeout handled).',
      details: { entity: 'sensor.example' }
    }
  ];

  async getLogs(options?: {
    source?: 'all' | 'nginx' | 'docker' | 'systemd';
    level?: 'all' | 'info' | 'warning' | 'error';
    query?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    let result = [...this.baseLogs];

    if (options?.source && options.source !== 'all') {
      result = result.filter((l) => l.source === options.source);
    }
    if (options?.level && options.level !== 'all') {
      result = result.filter((l) => l.level === options.level);
    }
    if (options?.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.service.toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q)
      );
    }

    const limit = options?.limit || 50;
    return result.slice(0, limit);
  }
}

export function createMockProviderBundle(): ProviderBundle {
  return {
    system: new MockSystemMetricsProvider(),
    docker: new MockDockerMetricsProvider(),
    nginx: new MockNginxMetricsProvider(),
    services: new MockServicesMetricsProvider(),
    network: new MockNetworkMetricsProvider(),
    logs: new MockLogsProvider()
  };
}
