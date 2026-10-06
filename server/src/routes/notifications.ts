import { Router } from 'express';

import { authenticate, getAuthenticatedUid } from '../middleware/authenticate.js';
import { notifyMessage } from '../services/messageNotifier.js';
import { badRequest } from '../utils/httpError.js';
import { isRecord, isValidId } from '../utils/parsers.js';

export const notificationsRouter = Router();

notificationsRouter.post('/notifications/messages', authenticate, async (req, res) => {
  const body: unknown = req.body;

  if (!isRecord(body) || !isValidId(body.conversationId) || !isValidId(body.messageId)) {
    throw badRequest('Informe conversationId e messageId válidos.');
  }

  const uid = getAuthenticatedUid(res);
  const result = await notifyMessage(uid, body.conversationId, body.messageId);

  res.status(result.status === 'sent' ? 201 : 200).json(result);
});
