import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { groupsRouter } from './routes/groups.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { uploadsRouter } from './routes/uploads.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '20kb' }));

  app.get('/', (_req, res) => {
    res.json({
      service: 'chat-firebase-push-api',
      endpoints: [
        'GET /health',
        'POST /notifications/messages',
        'POST /groups',
        'PATCH /groups/:groupId/limit',
        'POST /groups/:groupId/members',
        'DELETE /groups/:groupId/members/:memberId',
        'POST /uploads/signature',
      ],
    });
  });

  app.use(healthRouter);

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { code: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde um instante.' },
    }),
  );

  app.use(notificationsRouter);
  app.use(groupsRouter);
  app.use(uploadsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
