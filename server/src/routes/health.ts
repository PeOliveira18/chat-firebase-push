import { Router } from 'express';

export const healthRouter = Router();

/** Health check público para verificar a disponibilidade da API. */
healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'chat-firebase-push-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});
