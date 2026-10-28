import { type Router as ExpressRouter, Router } from 'express';

import { requireClientId } from '@/middleware/requireClientId.js';
import { adminRoutes } from '@/routes/admin.js';
import { chatRoutes } from '@/routes/chat.js';
import { conversationRoutes } from '@/routes/conversations.js';
import { docsRoutes } from '@/routes/docs.js';
import { messageRoutes } from '@/routes/messages.js';
import { shareRoutes } from '@/routes/shares.js';

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

// Conversation history (+ creating share links)
router.use('/conversations', requireClientId, conversationRoutes);

// Feedback on answers
router.use('/messages', requireClientId, messageRoutes);

// Shared conversations — reading needs no client id; continuing one checks it in the route
router.use('/shares', shareRoutes);

// Docs areas for the product-area filter
router.use('/docs', docsRoutes);

// Admin panel (open — see routes/admin.ts)
router.use('/admin', adminRoutes);

export const apiRoutes: ExpressRouter = router;
