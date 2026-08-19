
import express from "express";

import {
  createCertificate,
  getMyCertificates,
  getCertificateById,
  verifyCertificate,
  downloadCertificatePDF,
} from "../controllers/certificateController.js";

import {
  verifyToken,
  verifyAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* Public verification */

router.get("/verify/:qrToken", verifyCertificate);

/* Student history */

router.get("/my", verifyToken, getMyCertificates);

/* Download certificate PDF */

router.get(
  "/download/:certificateId",
  verifyToken,
  downloadCertificatePDF
);

/* Admin issue certificate */

router.post(
  "/",
  verifyToken,
  verifyAdmin,
  createCertificate
);

/* Get certificate */

router.get(
  "/:certificateId",
  getCertificateById
);

export default router;