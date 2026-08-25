import agentService from "../services/agentService.js";

export const chatWithAgent = async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const user = req.user || null;

    const result = await agentService.chat(
      message.trim(),
      user
    );

    return res.status(200).json({
      success: true,
      reply: result.reply,
    });
  } catch (error) {
    console.error("Agent controller error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "AI agent failed",
    });
  }
};