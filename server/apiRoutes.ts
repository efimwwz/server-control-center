import { Router, Request, Response } from 'express';
import { createMockProviderBundle } from './providers/mockMetricsProvider.js';
import { createLinuxProviderBundle } from './providers/linuxMetricsProvider.js';
import { analyzeServerWithAi } from './geminiService.js';
import { ProviderBundle } from './providers/metricsProvider.js';

// Select active provider bundle based on environment
const providerMode = process.env.METRICS_PROVIDER || 'mock';
const providers: ProviderBundle =
  providerMode === 'linux' ? createLinuxProviderBundle() : createMockProviderBundle();

export const apiRouter = Router();

// In-Memory Sliding Window Rate Limiter (e.g. max 120 requests per minute per IP)
interface ClientRateInfo {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, ClientRateInfo>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 150;

function rateLimiter(req: Request, res: Response, next: () => void) {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const info = rateLimitMap.get(ip);

  if (!info || now > info.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (info.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait before refreshing or sending queries.',
      retryAfterSeconds: Math.ceil((info.resetAt - now) / 1000)
    });
  }

  info.count += 1;
  next();
}

apiRouter.use(rateLimiter);

// GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Server Control Center',
    version: '1.0.0',
    mode: providerMode,
    timestamp: new Date().toISOString(),
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
  });
});

// GET /api/system
apiRouter.get('/system', async (_req: Request, res: Response) => {
  try {
    const data = await providers.system.getSystemMetrics();
    res.json(data);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve system metrics' });
  }
});

// GET /api/docker
apiRouter.get('/docker', async (_req: Request, res: Response) => {
  try {
    const data = await providers.docker.getDockerOverview();
    res.json(data);
  } catch (error) {
    console.error('Error fetching docker data:', error);
    res.status(500).json({ error: 'Failed to retrieve Docker information' });
  }
});

// GET /api/nginx
apiRouter.get('/nginx', async (_req: Request, res: Response) => {
  try {
    const data = await providers.nginx.getNginxStats();
    res.json(data);
  } catch (error) {
    console.error('Error fetching nginx data:', error);
    res.status(500).json({ error: 'Failed to retrieve Nginx metrics' });
  }
});

// GET /api/network
apiRouter.get('/network', async (_req: Request, res: Response) => {
  try {
    const data = await providers.network.getNetworkOverview();
    res.json(data);
  } catch (error) {
    console.error('Error fetching network data:', error);
    res.status(500).json({ error: 'Failed to retrieve network statistics' });
  }
});

// GET /api/services
apiRouter.get('/services', async (_req: Request, res: Response) => {
  try {
    const data = await providers.services.getServices();
    res.json(data);
  } catch (error) {
    console.error('Error fetching services data:', error);
    res.status(500).json({ error: 'Failed to retrieve services status' });
  }
});

// GET /api/logs
apiRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const source = req.query.source as 'all' | 'nginx' | 'docker' | 'systemd' | undefined;
    const level = req.query.level as 'all' | 'info' | 'warning' | 'error' | undefined;
    const query = req.query.query as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const data = await providers.logs.getLogs({
      source,
      level,
      query: typeof query === 'string' ? query.slice(0, 100) : undefined, // Safe sanitization
      limit: Math.min(Math.max(1, limit), 200)
    });
    res.json(data);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to retrieve system logs' });
  }
});

// POST /api/ai/analyze
apiRouter.post('/ai/analyze', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Field "question" must be a non-empty string' });
    }

    // Input sanitization: limit question length to 1000 characters
    const sanitizedQuestion = question.trim().slice(0, 1000);
    if (!sanitizedQuestion) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    // Collect latest snapshot for telemetry grounding
    const [system, docker, nginx, services, network, recentLogs] = await Promise.all([
      providers.system.getSystemMetrics(),
      providers.docker.getDockerOverview(),
      providers.nginx.getNginxStats(),
      providers.services.getServices(),
      providers.network.getNetworkOverview(),
      providers.logs.getLogs({ limit: 15 })
    ]);

    const result = await analyzeServerWithAi(sanitizedQuestion, {
      system,
      docker,
      nginx,
      services,
      network,
      recentLogs
    });

    res.json(result);
  } catch (error) {
    console.error('Error in AI analysis endpoint:', error);
    res.status(500).json({ error: 'Internal AI processing error' });
  }
});
