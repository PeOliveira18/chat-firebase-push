import { Router } from 'express';

import { authenticate, getAuthenticatedUid } from '../middleware/authenticate.js';
import { createUploadSignature, UploadTarget } from '../services/imageUpload.js';
import { badRequest } from '../utils/httpError.js';
import { isRecord } from '../utils/parsers.js';

export const uploadsRouter = Router();

const GROUP_ID_REGEX = /^[A-Za-z0-9]{20}$/;

function parseTarget(body: unknown): UploadTarget {
  if (isRecord(body) && body.target === 'avatar') {
    return { type: 'avatar' };
  }

  if (isRecord(body) && body.target === 'group' && typeof body.groupId === 'string' && GROUP_ID_REGEX.test(body.groupId)) {
    return { type: 'group', groupId: body.groupId };
  }

  throw badRequest('Destino de upload inválido.');
}

uploadsRouter.post('/uploads/signature', authenticate, async (req, res) => {
  const signature = await createUploadSignature(getAuthenticatedUid(res), parseTarget(req.body));
  res.json(signature);
});
