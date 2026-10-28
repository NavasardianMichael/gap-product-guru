import { idParamsSchema } from '@gap-product-guru/shared';
import { type Request, type Router as ExpressRouter, Router } from 'express';

import { requireClientId } from '@/middleware/requireClientId.js';
import { validate } from '@/middleware/validate.js';
import { shareService } from '@/services/shareService.js';

const router: ExpressRouter = Router();

const shareId = (req: Request): string => req.params.id as string;

// GET /api/shares/:id — a shared conversation, read-only (anyone with the link)
router.get('/:id', validate(idParamsSchema, 'params'), async (req, res, next) => {
  try {
    const shared = await shareService.get(shareId(req));
    res.json({ success: true, data: shared });
  } catch (error) {
    next(error);
  }
});

// POST /api/shares/:id/continue — copy it into this browser's conversations
router.post(
  '/:id/continue',
  requireClientId,
  validate(idParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const conversation = await shareService.continue(shareId(req), req.clientId!);
      res.status(201).json({ success: true, data: conversation });
    } catch (error) {
      next(error);
    }
  },
);

export const shareRoutes: ExpressRouter = router;
