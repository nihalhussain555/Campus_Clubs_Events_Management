import Groq from "groq-sdk";
import buildCampusContext from "./agentContext.js";

import { GROQ_API_KEY, GROQ_MODEL } from "../config/env.js";

// The SDK throws when constructed without a key, which would crash the whole
// server at import time on a deploy that forgot GROQ_API_KEY. Build it on the
// first request instead so only the assistant is affected.
let client = null;

// Exported so the help assistant reuses this one client and its key handling
// instead of constructing a second Groq connection.
export const getGroqClient = () => {
  if (!GROQ_API_KEY) {
    throw new Error(
      "The AI assistant is not configured. Set GROQ_API_KEY on the server."
    );
  }

  if (!client) client = new Groq({ apiKey: GROQ_API_KEY });

  return client;
};

const agentService = {
  async chat(message, user = null) {
    try {
      if (!message || !message.trim()) {
        throw new Error("Message is required");
      }

      const client = getGroqClient();
      const campus = await buildCampusContext(user);

      const systemPrompt = `
You are the Campus Clubs assistant for a college events and clubs platform.

You answer questions about clubs, events, registrations, attendance,
certificates, notifications and profiles.

AUTHORITATIVE CAMPUS DATA
${JSON.stringify(campus)}

Rules for that data:
- It is a live snapshot taken from the database at the moment of this request.
- Treat it as the only source of truth about names, dates, counts, venues,
  capacity, registration and attendance. Quote from it directly.
- If it does not contain what the user asked for, say plainly that you do not
  have that information. Never guess, and never invent clubs, events, dates,
  numbers or people.
- Do not describe a button, menu or page unless it is listed below.

The product itself:
- Students browse and register for events on the Events page, join or leave
  clubs on the Clubs page, and see dates on the Calendar page.
- Registering for an upcoming event issues a QR check-in code, shown on the
  Events page once the event is live; the organiser verifies it.
- Certificates appear on the My Certificates page after attendance is recorded,
  and any certificate can be verified from its public link.
- Notifications appear in the bell menu in the header and on the Notifications
  page. Profile editing happens on Account Settings.
- Club leaders get a Dashboard with their clubs, event creation, the check-in
  desk and the attendance roster. Administrators get the Admin panel.

Style:
- Keep answers concise and friendly, in simple language for college students.
- Restate the snapshot in plain words. Never print its raw JSON keys or field
  names back to the user.
- Never claim you performed an action you did not perform.
${
  user
    ? `Signed-in user: ${user.name || "unknown"} (${user.email || "no email"}), role ${
        user.effectiveRole || user.role || "student"
      }${user.department ? `, department ${user.department}` : ""}.`
    : "No user is signed in; describe the public side of the product only."
}
`.trim();

      const completion = await client.chat.completions.create({
        model: GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message.trim(),
          },
        ],
        temperature: 0.4,
        max_tokens: 700,
      });

      const reply =
        completion.choices?.[0]?.message?.content?.trim();

      if (!reply) {
        throw new Error("Empty response from Groq");
      }

      return {
        success: true,
        reply,
      };
    } catch (error) {
      console.error("Groq Agent Error:", error);

      if (error?.status === 401) {
        throw new Error("Invalid Groq API key");
      }

      if (error?.status === 429) {
        throw new Error(
          "Groq API rate limit reached. Please try again later."
        );
      }

      throw new Error(
        error?.message ||
          "Failed to generate AI response"
      );
    }
  },
};

export default agentService;
