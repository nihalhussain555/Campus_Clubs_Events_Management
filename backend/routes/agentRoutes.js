import express from "express";

import { chatWithAgent } from "../controllers/agentController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
  POST
  /api/agent/chat

  Protected because the agent can access
  the logged-in student's certificate information.
*/

router.post("/chat", verifyToken, chatWithAgent);

export default router;