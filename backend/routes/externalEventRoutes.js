import express from 'express';

import {
  getExternalEvents,
  getExternalEventMeta,
  getExternalEvent,
  createExternalEvent,
  updateExternalEvent,
  deleteExternalEvent,
  addExternalEventBookmark,
  removeExternalEventBookmark
} from '../controllers/externalEventController.js';

import {
  verifyToken,
  requireRoles,
  ROLES
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Every external-event route needs a signed-in account. Students browse and
// save; only the two managing roles can write, and the controller then checks
// that a leader is only editing a listing they posted themselves.
router.use(verifyToken);

const MANAGE = requireRoles(ROLES.ADMIN, ROLES.CLUB_LEADER);

// Declared before /:id so "meta" is never read as an event id.
router.get('/meta', getExternalEventMeta);

router.get('/', getExternalEvents);
router.post('/', MANAGE, createExternalEvent);

router.get('/:id', getExternalEvent);
router.put('/:id', MANAGE, updateExternalEvent);
router.delete('/:id', MANAGE, deleteExternalEvent);

router.post('/:id/bookmark', addExternalEventBookmark);
router.delete('/:id/bookmark', removeExternalEventBookmark);

export default router;
