import { type Router as ExpressRouter, Router } from 'express';

import { requireClientId } from '@/middleware/requireClientId.js';
import { chatRoutes } from '@/routes/chat.js';
import { conversationRoutes } from '@/routes/conversations.js';

const router: ExpressRouter = Router();

// Health check (no X-Client-Id needed)
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

// Chat (SSE)
router.use('/chat', requireClientId, chatRoutes);

// Conversation history
router.use('/conversations', requireClientId, conversationRoutes);

export const apiRoutes: ExpressRouter = router;
