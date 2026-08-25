import React, { useEffect, useRef, useState } from "react";

import {
  Bot,
  X,
  Send,
  Sparkles,
  Minimize2,
} from "lucide-react";

import { agentAPI } from "../services/api";

const AIAgent = () => {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! 👋 I'm Campus Clubs AI. I can help you with events, clubs, certificates and your campus activities.",
    },
  ]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || loading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await agentAPI.chat(text);

      const reply =
        response.data?.reply ||
        "Sorry, I couldn't understand that.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (error) {
      console.error("Agent error:", error);

      let errorMessage =
        "Sorry, I'm unable to connect right now.";

      if (error.response?.status === 401) {
        errorMessage =
          "Please log in to use Campus Clubs AI.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* =====================================================
          CHAT WINDOW
      ===================================================== */}

      {open && (
        <div
          className="
            fixed
            bottom-24
            left-5
            z-[9999]
            w-[350px]
            max-w-[calc(100vw-40px)]
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-2xl
          "
        >

          {/* HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              bg-[#073c57]
              px-4
              py-4
              text-white
            "
          >

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-white
                  text-[#073c57]
                "
              >
                <Bot size={22} />
              </div>

              <div>

                <div className="flex items-center gap-1.5">

                  <h3 className="font-black">
                    Campus Clubs AI
                  </h3>

                  <Sparkles
                    size={14}
                    className="text-yellow-300"
                  />

                </div>

                <p className="text-xs text-slate-200">
                  AI Campus Assistant
                </p>

              </div>

            </div>

            <div className="flex items-center gap-1">

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                "
                aria-label="Minimize AI assistant"
              >
                <Minimize2 size={17} />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="
                  rounded-full
                  p-2
                  transition
                  hover:bg-white/10
                "
                aria-label="Close AI assistant"
              >
                <X size={18} />
              </button>

            </div>

          </div>


          {/* MESSAGES */}

          <div
            className="
              h-[390px]
              overflow-y-auto
              bg-slate-50
              p-4
            "
          >

            {messages.map((message) => (

              <div
                key={message.id}
                className={`mb-4 flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                {message.role === "assistant" && (
                  <div
                    className="
                      mr-2
                      mt-1
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-[#073c57]
                      text-white
                    "
                  >
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`
                    max-w-[78%]
                    rounded-2xl
                    px-4
                    py-3
                    text-sm
                    leading-6
                    ${
                      message.role === "user"
                        ? "rounded-br-md bg-[#145f82] text-white"
                        : "rounded-bl-md bg-white text-slate-700 shadow-sm border border-slate-100"
                    }
                  `}
                >
                  {message.content}
                </div>

              </div>

            ))}


            {/* TYPING */}

            {loading && (

              <div className="flex items-center gap-2">

                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    bg-[#073c57]
                    text-white
                  "
                >
                  <Bot size={16} />
                </div>

                <div
                  className="
                    rounded-2xl
                    rounded-bl-md
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-500
                    shadow-sm
                  "
                >
                  Thinking...
                </div>

              </div>

            )}

            <div ref={messagesEndRef} />

          </div>


          {/* INPUT */}

          <div
            className="
              border-t
              border-slate-200
              bg-white
              p-3
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-2
              "
            >

              <input
                type="text"
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Ask about events, clubs..."
                disabled={loading}
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  px-2
                  py-2
                  text-sm
                  outline-none
                  placeholder:text-slate-400
                "
              />

              <button
                type="button"
                onClick={sendMessage}
                disabled={
                  loading ||
                  !input.trim()
                }
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#145f82]
                  text-white
                  transition
                  hover:bg-[#073c57]
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Send message"
              >
                <Send size={17} />
              </button>

            </div>

          </div>

        </div>
      )}


      {/* =====================================================
          FLOATING BUTTON
      ===================================================== */}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="
            fixed
            bottom-5
            left-5
            z-[9999]
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-full
            bg-[#073c57]
            text-white
            shadow-xl
            transition
            duration-200
            hover:scale-105
            hover:bg-[#145f82]
          "
          aria-label="Open Campus Clubs AI"
        >

          <Bot size={26} />

          {/* ONLINE DOT */}

          <span
            className="
              absolute
              right-0
              top-0
              h-4
              w-4
              rounded-full
              border-2
              border-white
              bg-green-500
            "
          />

        </button>
      )}

    </>
  );
};

export default AIAgent;