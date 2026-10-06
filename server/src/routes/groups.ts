import { Router } from 'express';

import { authenticate, getAuthenticatedUid } from '../middleware/authenticate.js';
import { addMembers, createGroup, removeMember, updateMemberLimit } from '../services/groupMembership.js';
import { badRequest } from '../utils/httpError.js';
import { isRecord, isValidId } from '../utils/parsers.js';

export const groupsRouter = Router();

groupsRouter.use('/groups', authenticate);

function readBody(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw badRequest('Corpo da requisição inválido.');
  }

  return body;
}

function readGroupId(value: unknown): string {
  if (!isValidId(value) || value.includes('_')) {
    throw badRequest('Grupo inválido.');
  }

  return value;
}

groupsRouter.post('/groups', async (req, res) => {
  const body = readBody(req.body);
  const group = await createGroup(getAuthenticatedUid(res), {
    groupId: body.groupId,
    name: body.name,
    photoUrl: body.photoUrl,
    memberIds: body.memberIds,
    memberLimit: body.memberLimit,
    notificationPolicy: body.notificationPolicy,
  });

  res.status(201).json(group);
});

groupsRouter.patch('/groups/:groupId/limit', async (req, res) => {
  const body = readBody(req.body);
  const group = await updateMemberLimit(getAuthenticatedUid(res), readGroupId(req.params.groupId), body.memberLimit);

  res.json(group);
});

groupsRouter.post('/groups/:groupId/members', async (req, res) => {
  const body = readBody(req.body);
  const group = await addMembers(getAuthenticatedUid(res), readGroupId(req.params.groupId), body.memberIds);

  res.json(group);
});

groupsRouter.delete('/groups/:groupId/members/:memberId', async (req, res) => {
  const group = await removeMember(
    getAuthenticatedUid(res),
    readGroupId(req.params.groupId),
    req.params.memberId,
  );

  res.json(group);
});
