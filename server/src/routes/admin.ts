import {
  adminFeedbackQuerySchema,
  type AdminFeedbackUpdate,
  adminFeedbackUpdateSchema,
  ErrorCode,
  HttpStatus,
  idParamsSchema,
} from '@gap-product-guru/shared';
import { type Router as ExpressRouter, Router } from 'express';

import { AppError } from '@/middleware/errorHandler.js';
import { validate } from '@/middleware/validate.js';
import { feedbackService } from '@/services/feedbackService.js';

// Open on purpose (no login yet): anyone who knows /admin can read and resolve feedback.
// See docs/CHAT_UI.md#admin-panel before exposing the app outside the team.
const router: ExpressRouter = Router();

// GET /api/admin/feedback?view=open|resolved|helpful
router.get('/feedback', async (req, res, next) => {
  try {
    // `validate` cannot write req.query in Express 5, so the query is parsed here
    const query = adminFeedbackQuerySchema.safeParse(req.query);
    if (!query.success) {
      throw new AppError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.VALIDATION_ERROR,
        'Invalid view',
      );
    }
    const list = await feedbackService.listForAdmin(query.data.view);
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/feedback/:id — mark a report resolved / reopen it
router.patch(
  '/feedback/:id',
  validate(idParamsSchema, 'params'),
  validate(adminFeedbackUpdateSchema),
  async (req, res, next) => {
    try {
      const { resolved } = req.body as AdminFeedbackUpdate;
      const item = await feedbackService.setResolved(req.params.id as string, resolved);
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },
);

export const adminRoutes: ExpressRouter = router;
