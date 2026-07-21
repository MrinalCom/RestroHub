"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../lib/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  degraded?: boolean;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! Ask me about the menu, dish recommendations, or anything else about RestroHub.",
};

export default function ChatWidget() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/concierge/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMessages([
        ...next,
        { role: "assistant", content: data.reply || "…", degraded: Boolean(data.degraded) },
      ]);
    } catch (err) {
      setMessages([
        ...next,
        { role: "assistant", content: (err as Error).message, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget">
      <AnimatePresence>
        {open && (
          <motion.div
            className="chat-panel"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <div className="chat-header">
              <div className="chat-header-title">RestroHub concierge</div>
              <div className="chat-header-sub">Ask a question</div>
            </div>

            <div className="chat-messages" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i}>
                  <div className={`chat-bubble ${m.role}${m.error ? " error" : ""}`}>
                    {m.content}
                  </div>
                  {m.degraded && <div className="chat-degraded-tag">Basic mode — smart assistant offline</div>}
                </div>
              ))}
              {loading && (
                <div className="chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            <div className="chat-input-row">
              <input
                type="text"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <button onClick={send} disabled={loading || !input.trim()}>
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="chat-toggle"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? "✕" : "💬"}
      </motion.button>
    </div>
  );
}
