import { Router, Request, Response } from 'express';
import { createMockProviderBundle } from './providers/mockMetricsProvider.js';
import { analyzeServerWithAi } from './geminiService.js';
import { ProviderBundle } from './providers/metricsProvider.js';
import {
  AgentSystemMetricsProvider,
  AgentDockerMetricsProvider,
  AgentNginxMetricsProvider,
  AgentServicesMetricsProvider,
  AgentNetworkMetricsProvider,
  AgentLogsProvider,
  AgentSecurityMetricsProvider,
} from './providers/agentMetricsProvider.js';

// Production must use the host agent. Mock data is reserved for local
// development and explicit demo use; the old "linux" adapter returned mock
// data for most metrics and is intentionally no longer selectable.
const providerMode =
  process.env.METRICS_PROVIDER ||
  (process.env.NODE_ENV === 'production' ? 'agent' : 'mock');

if (providerMode !== 'agent' && providerMode !== 'mock') {
  throw new Error(
    'Invalid METRICS_PROVIDER. Supported values are "agent" and "mock".',
  );
}

const providers: ProviderBundle = createMockProviderBundle();

// Real host-agent providers
const agentSystem = new AgentSystemMetricsProvider();
const agentDocker = new AgentDockerMetricsProvider();
const agentNginx = new AgentNginxMetricsProvider();
const agentServices = new AgentServicesMetricsProvider();
const agentNetwork = new AgentNetworkMetricsProvider();
const agentLogs = new AgentLogsProvider();
const agentSecurity = new AgentSecurityMetricsProvider();

export const apiRouter = Router();

// Bounded in-memory rate limits. The general limit is high enough for
// the fastest dashboard polling interval (seven requests every two seconds).
interface ClientRateInfo {
  count: number;
  resetAt: number;
}

function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  message: string,
) {
  const clients = new Map<string, ClientRateInfo>();
  const maxClients = 10_000;
  let lastCleanup = 0;

  return (req: Request, res: Response, next: () => void) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (now - lastCleanup >= windowMs) {
      for (const [key, value] of clients) {
        if (value.resetAt <= now) clients.delete(key);
      }
      lastCleanup = now;
    }

    let info = clients.get(ip);
    if (!info || now >= info.resetAt) {
      if (!info && clients.size >= maxClients) {
        return res.status(503).json({
          error: 'Rate limiter capacity reached',
          message: 'Please retry shortly.',
        });
      }
      info = { count: 0, resetAt: now + windowMs };
      clients.set(ip, info);
    }

    if (info.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfterSeconds: Math.max(1, Math.ceil((info.resetAt - now) / 1000)),
      });
    }

    info.count += 1;
    next();
  };
}

const rateLimiter = createRateLimiter(
  1800,
  60 * 1000,
  'API request limit exceeded. Please wait before retrying.',
);
const aiRateLimiter = createRateLimiter(
  12,
  60 * 1000,
  'AI request limit exceeded. Please wait before asking another question.',
);

apiRouter.use(rateLimiter);

// GET /api/health
apiRouter.get(
  '/health',
  (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      app: 'Server Control Center',
      version: '1.1.1',
      mode: providerMode,
      timestamp: new Date().toISOString(),
      geminiConfigured: !!(
        process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
    });
  },
);

// GET /api/system
apiRouter.get(
  '/system',
  async (_req: Request, res: Response) => {
    try {
      const data =
        providerMode === 'agent'
          ? await agentSystem.getSystemMetrics()
          : await providers.system.getSystemMetrics();

      res.json(data);
    } catch (error) {
      console.error(
        'Error fetching system metrics:',
        error,
      );

      res.status(502).json({
        error:
          providerMode === 'agent'
            ? 'Failed to retrieve real system metrics from SCC agent'
            : 'Failed to retrieve system metrics',
      });
    }
  },
);

// GET /api/docker
apiRouter.get(
  '/docker',
  async (_req: Request, res: Response) => {
    try {
      const data =
        providerMode === 'agent'
          ? await agentDocker.getDockerOverview()
          : await providers.docker.getDockerOverview();

      res.json(data);
    } catch (error) {
      console.error(
        'Error fetching docker data:',
        error,
      );

      res.status(502).json({
        error:
          providerMode === 'agent'
            ? 'Failed to retrieve real Docker data from SCC agent'
            : 'Failed to retrieve Docker information',
      });
    }
  },
);

// GET /api/nginx
apiRouter.get(
  '/nginx',
  async (_req: Request, res: Response) => {
    try {
      const data =
        providerMode === 'agent'
          ? await agentNginx.getNginxStats()
          : await providers.nginx.getNginxStats();

      res.json(data);
    } catch (error) {
      console.error(
        'Error fetching nginx data:',
        error,
      );

      res.status(500).json({
        error: 'Failed to retrieve Nginx metrics',
      });
    }
  },
);

// GET /api/network
apiRouter.get(
  '/network',
  async (_req: Request, res: Response) => {
    try {
      const data =
        providerMode === 'agent'
          ? await agentNetwork.getNetworkOverview()
          : await providers.network.getNetworkOverview();

      res.json(data);
    } catch (error) {
      console.error(
        'Error fetching network data:',
        error,
      );

      res.status(500).json({
        error:
          'Failed to retrieve network statistics',
      });
    }
  },
);

// GET /api/services
apiRouter.get(
  '/services',
  async (_req: Request, res: Response) => {
    try {
      const data =
        providerMode === 'agent'
          ? await agentServices.getServices()
          : await providers.services.getServices();

      res.json(data);
    } catch (error) {
      console.error(
        'Error fetching services data:',
        error,
      );

      res.status(500).json({
        error:
          'Failed to retrieve services status',
      });
    }
  },
);


// GET /api/security — real read-only host security posture.
apiRouter.get(
  '/security',
  async (_req: Request, res: Response) => {
    if (providerMode !== 'agent') {
      return res.status(503).json({
        error: 'Security telemetry requires METRICS_PROVIDER=agent',
      });
    }

    try {
      const data = await agentSecurity.getSecurityOverview();
      res.setHeader('Cache-Control', 'no-store');
      res.json(data);
    } catch (error) {
      console.error('Error fetching security posture:', error);
      res.status(502).json({
        error: 'Failed to retrieve host security posture from SCC agent',
      });
    }
  },
);

// GET /api/logs
apiRouter.get(
  '/logs',
  async (req: Request, res: Response) => {
    try {
      const source =
        req.query.source as
          | 'all'
          | 'nginx'
          | 'docker'
          | 'systemd'
          | undefined;

      const level =
        req.query.level as
          | 'all'
          | 'info'
          | 'warning'
          | 'error'
          | undefined;

      const query =
        req.query.query as string | undefined;

      const limit = req.query.limit
        ? parseInt(
            req.query.limit as string,
            10,
          )
        : 50;

      const logOptions = {
        source,
        level,
        query:
          typeof query === 'string'
            ? query.slice(0, 100)
            : undefined,
        limit: Math.min(
          Math.max(1, limit),
          200,
        ),
      };

      const data =
        providerMode === 'agent'
          ? await agentLogs.getLogs(logOptions)
          : await providers.logs.getLogs(logOptions);

      res.json(data);
    } catch (error) {
      console.error(
        'Error fetching logs:',
        error,
      );

      res.status(500).json({
        error: 'Failed to retrieve system logs',
      });
    }
  },
);

// POST /api/ai/analyze
apiRouter.post(
  '/ai/analyze',
  aiRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (
        !question ||
        typeof question !== 'string'
      ) {
        return res.status(400).json({
          error:
            'Field "question" must be a non-empty string',
        });
      }

      const sanitizedQuestion =
        question.trim().slice(0, 1000);

      if (!sanitizedQuestion) {
        return res.status(400).json({
          error: 'Question cannot be empty',
        });
      }

      // Collect latest telemetry snapshot.
      // System + Docker use the real SCC agent
      // when METRICS_PROVIDER=agent.
      const [
        system,
        docker,
        nginx,
        services,
        network,
        recentLogs,
      ] = await Promise.all([
        providerMode === 'agent'
          ? agentSystem.getSystemMetrics()
          : providers.system.getSystemMetrics(),

        providerMode === 'agent'
          ? agentDocker.getDockerOverview()
          : providers.docker.getDockerOverview(),

        providerMode === 'agent'
          ? agentNginx.getNginxStats()
          : providers.nginx.getNginxStats(),

        providerMode === 'agent'
          ? agentServices.getServices()
          : providers.services.getServices(),

        providerMode === 'agent'
          ? agentNetwork.getNetworkOverview()
          : providers.network.getNetworkOverview(),

        providerMode === 'agent'
          ? agentLogs.getLogs({ limit: 15 })
          : providers.logs.getLogs({ limit: 15 }),
      ]);

      const result =
        await analyzeServerWithAi(
          sanitizedQuestion,
          {
            system,
            docker,
            nginx,
            services,
            network,
            recentLogs,
          },
        );

      res.json(result);
    } catch (error) {
      console.error(
        'Error in AI analysis endpoint:',
        error,
      );

      res.status(500).json({
        error:
          'Internal AI processing error',
      });
    }
  },
);
