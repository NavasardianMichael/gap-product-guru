import { conversationParamsSchema } from '@gap-product-guru/shared';
import { type Request, type Router as ExpressRouter, Router } from 'express';

import { validate } from '@/middleware/validate.js';
import { conversationService } from '@/services/conversationService.js';
import { shareService } from '@/services/shareService.js';

const router: ExpressRouter = Router();

/** Express 5 types params as `string | string[]`; `validate` has already checked it is a uuid. */
const conversationId = (req: Request): string => req.params.id as string;

// GET /api/conversations — this browser's conversations, newest first
router.get('/', async (req, res, next) => {
  try {
    const conversations = await conversationService.list(req.clientId!);
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
});

// GET /api/conversations/:id — one conversation with its messages
router.get('/:id', validate(conversationParamsSchema, 'params'), async (req, res, next) => {
  try {
    const conversation = await conversationService.get(conversationId(req), req.clientId!);
    res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
});

// POST /api/conversations/:id/share — a read-only snapshot link of the conversation as it is now
router.post('/:id/share', validate(conversationParamsSchema, 'params'), async (req, res, next) => {
  try {
    const link = await shareService.create(conversationId(req), req.clientId!);
    res.status(201).json({ success: true, data: link });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/conversations/:id
router.delete('/:id', validate(conversationParamsSchema, 'params'), async (req, res, next) => {
  try {
    const id = conversationId(req);
    await conversationService.remove(id, req.clientId!);
    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

export const conversationRoutes: ExpressRouter = router;
