import express from 'express';

import {
  getHelpContent,
  chatWithAssistant,
  createSupportRequest,
  getMySupportRequests,
  listSupportRequests,
  updateSupportRequest
} from '../controllers/helpController.js';

import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';
import { agentLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

// Everything here is signed-in: the Help Center shows role-specific guidance
// drawn from the caller's own permissions, so it is never public content.
router.use(verifyToken);

// Documentation catalog, already filtered by the caller's role.
router.get('/content', getHelpContent);

// ClubAssist. Shares the AI rate-limit bucket with the campus agent because
// both cost the same provider quota.
router.post('/assistant', agentLimiter, chatWithAssistant);

// The signed-in user's own tickets.
router.post('/requests', createSupportRequest);
router.get('/requests/mine', getMySupportRequests);

// The help-desk queue is administrators only.
router.get('/requests', verifyAdmin, listSupportRequests);
router.put('/requests/:id', verifyAdmin, updateSupportRequest);

export default router;
