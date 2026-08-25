import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const agentService = {
  async chat(message, user = null) {
    try {
      if (!message || !message.trim()) {
        throw new Error("Message is required");
      }

      const systemPrompt = `
You are Campus Clubs AI Assistant.

You are an intelligent assistant for a college campus management platform called "Campus Clubs".

Your responsibilities:
- Help students understand and use Campus Clubs.
- Answer questions about clubs, events, registrations, attendance, certificates, notifications and profiles.
- Give simple and accurate explanations.
- Help users navigate the website.
- If the user asks something unrelated to Campus Clubs, you can still answer briefly and politely.
- Never claim that you performed an action if you did not actually perform it.
- Do not invent event names, club names, certificates, dates or user information.
- Keep answers concise and friendly.
- Use simple language suitable for college students.

Current user information:
${user
  ? `
Name: ${user.name || "Not available"}
Email: ${user.email || "Not available"}
Role: ${user.role || "student"}
Student ID: ${user.studentId || "Not available"}
Department: ${user.department || "Not available"}
Course: ${user.course || "Not available"}
`
  : "User information is not available."}

If the user asks about something that requires accessing actual database information, explain that the assistant needs the relevant Campus Clubs data/API rather than making up information.
`;

      const completion = await groq.chat.completions.create({
        model:
          process.env.GROQ_MODEL ||
          "llama-3.3-70b-versatile",

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

        temperature: 0.5,
        max_tokens: 500,
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