import { type Router as ExpressRouter, Router } from 'express';

import { docsService } from '@/services/docsService.js';

const router: ExpressRouter = Router();

// GET /api/docs/areas — the docs areas the chat can be narrowed to
router.get('/areas', async (_req, res, next) => {
  try {
    const areas = await docsService.listAreas();
    res.json({ success: true, data: areas });
  } catch (error) {
    next(error);
  }
});

export const docsRoutes: ExpressRouter = router;
