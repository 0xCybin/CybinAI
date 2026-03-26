"use client";

import { useState } from "react";

interface TestConversationProps {
  onNext: () => void;
  onBack: () => void;
  businessName?: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function TestConversation({ onNext, onBack, businessName }: TestConversationProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Hi! I'm the AI assistant for ${businessName || "your business"}. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    // Simulated response for now - real integration connects to /api/v1/chat
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Thanks for your question! In the live version, I'll answer based on your services and FAQs. Once you go live, I'll give your customers real answers right away.",
        },
      ]);
      setLoading(false);
    }, 1000);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Test Your AI</h2>
        <p className="text-zinc-400 mt-1">
          Try asking a question your customers would ask. For example:{" "}
          <span className="text-zinc-300 italic">"How much does a service cost?"</span> or{" "}
          <span className="text-zinc-300 italic">"Are you open on weekends?"</span>
        </p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="p-4 min-h-[240px] max-h-[320px] overflow-y-auto space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-amber-600 text-white rounded-br-sm"
                    : "bg-zinc-700 text-zinc-100 rounded-bl-sm"
                  }
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-700 text-zinc-400 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="border-t border-zinc-700 flex gap-2 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a customer question..."
            className="flex-1 min-h-[44px] px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="min-h-[44px] px-5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
          >
            Send
          </button>
        </form>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 min-h-[48px] bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-amber-600/20"
        >
          Looks good, continue
        </button>
      </div>
    </div>
  );
}
