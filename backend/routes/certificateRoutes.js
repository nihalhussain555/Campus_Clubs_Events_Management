import express from 'express';

import {
  getMyCertificates,
  getCertificateById
} from '../controllers/certificateController.js';

import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();


// =====================================================
// MY CERTIFICATES
// =====================================================

router.get(
  '/my',
  verifyToken,
  getMyCertificates
);


// =====================================================
// PUBLIC CERTIFICATE VERIFICATION
// =====================================================

router.get(
  '/verify/:certificateId',
  getCertificateById
);


export default router;