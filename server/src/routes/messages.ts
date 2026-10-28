import {
  type FeedbackRequest,
  feedbackRequestSchema,
  idParamsSchema,
} from '@gap-product-guru/shared';
import { type Request, type Router as ExpressRouter, Router } from 'express';

import { validate } from '@/middleware/validate.js';
import { feedbackService } from '@/services/feedbackService.js';

const router: ExpressRouter = Router();

const messageId = (req: Request): string => req.params.id as string;

// PUT /api/messages/:id/feedback — thumbs up or a report (replaces earlier feedback)
router.put(
  '/:id/feedback',
  validate(idParamsSchema, 'params'),
  validate(feedbackRequestSchema),
  async (req, res, next) => {
    try {
      const feedback = await feedbackService.give(
        messageId(req),
        req.clientId!,
        req.body as FeedbackRequest,
      );
      res.json({ success: true, data: feedback });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/messages/:id/feedback — take back this browser's feedback
router.delete('/:id/feedback', validate(idParamsSchema, 'params'), async (req, res, next) => {
  try {
    await feedbackService.remove(messageId(req), req.clientId!);
    res.json({ success: true, data: { id: messageId(req) } });
  } catch (error) {
    next(error);
  }
});

export const messageRoutes: ExpressRouter = router;
