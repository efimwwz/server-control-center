export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  currentTime: string;
  status: 'online' | 'warning' | 'critical';
  cpuCores: number;
  cpuModel: string;
}

export interface MetricHistoryPoint {
  time: string;
  timestamp: number;
  cpu: number;
  ram: number;
  networkRxKbps: number;
  networkTxKbps: number;
  load1m: number;
}

export interface SystemMetrics {
  info: SystemInfo;
  cpu: {
    usagePercent: number;
    userPercent: number;
    systemPercent: number;
    idlePercent: number;
    temperatureC?: number;
  };
  ram: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    cachedBytes: number;
    usagePercent: number;
  };
  disk: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
    mountPoint: string;
    filesystem: string;
  };
  loadAvg: {
    load1m: number;
    load5m: number;
    load15m: number;
  };
  network: {
    rxBytesSec: number;
    txBytesSec: number;
    rxFormatted: string;
    txFormatted: string;
  };
  history: MetricHistoryPoint[];
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: 'UP' | 'STOPPED' | 'RESTARTING' | 'ERROR';
  statusDetail: string;
  uptime: string;
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryFormatted: string;
  ports: string[];
  created: string;
  restartCount: number;
  command: string;
}

export interface DockerOverview {
  total: number;
  running: number;
  stopped: number;
  restarting: number;
  error: number;
  containers: DockerContainer[];
  engineVersion: string;
}

export interface NginxRequestPoint {
  time: string;
  requests: number;
  latencyMs: number;
}

export interface NginxStats {
  status: 'active' | 'warning' | 'stopped';
  version: string;
  uptimeFormatted: string;
  activeConnections: number;
  reading: number;
  writing: number;
  waiting: number;
  totalRequests: number;
  totalTrafficBytes: number;
  requestsPerSec: number;
  statusCodeCounts: {
    code2xx: number;
    code3xx: number;
    code4xx: number;
    code5xx: number;
  };
  requestHistory: NginxRequestPoint[];
  topVirtualHosts: {
    serverName: string;
    listenPort: number;
    upstream: string;
    requests: number;
    status: 'healthy' | 'warning';
  }[];
}

export interface SystemService {
  name: string;
  unitName: string;
  active: boolean;
  status: 'active' | 'inactive' | 'failed';
  subStatus: string;
  uptime: string;
  pid: number;
  memoryBytes: number;
  memoryFormatted: string;
  description: string;
  enabledOnBoot: boolean;
}

export interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'bridge' | 'loopback' | 'virtual';
  state: 'UP' | 'DOWN';
  ipv4: string;
  netmask: string;
  mac: string;
  mtu: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  speed: string;
}

export interface NetworkOverview {
  publicIp: string;
  hostname: string;
  defaultGateway: string;
  dnsServers: string[];
  interfaces: NetworkInterface[];
  rxSpeedBytesSec: number;
  txSpeedBytesSec: number;
  rxSpeedFormatted: string;
  txSpeedFormatted: string;
  packetLossPercent: number;
  latencyMs: number;
  pingTarget: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: 'nginx' | 'docker' | 'systemd';
  level: 'info' | 'warning' | 'error';
  service: string;
  message: string;
  details?: Record<string, string | number | boolean>;
}

export interface AiAnalyzeResponse {
  answer: string;
  timestamp: string;
  modelUsed: string;
  insights?: {
    type: 'ok' | 'warning' | 'action_needed';
    summary: string;
  }[];
}

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  mode: string;
  timestamp: string;
  geminiConfigured: boolean;
}
