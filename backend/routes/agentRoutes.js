import express from "express";

import { chatWithAgent } from "../controllers/agentController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
  POST
  /api/agent/chat

  Protected: the agent answers using the logged-in student's identity, and the
  call spends Groq quota, so leaving it open was both a data leak and a metered
  abuse surface.
*/

router.post("/chat", verifyToken, chatWithAgent);

export default router;
