"use client";

import { useState } from "react";

interface TestConversationProps {
  onNext: () => void;
  onBack: () => void;
  onGoToFAQs?: () => void;
  businessName?: string;
  industry?: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

const INDUSTRY_EXAMPLES: Record<string, { user: string; assistant: string }[]> = {
  Grooming: [
    { user: "How much is a full grooming for a medium-sized dog?", assistant: "A full grooming for a medium-sized dog typically runs $45-$75 depending on the breed and coat condition. That includes a bath, haircut, nail trim, and ear cleaning. Want me to help you book an appointment?" },
    { user: "Do you groom cats too?", assistant: "We do work with cats! Cat grooming starts at $55 and includes a bath, nail trim, and brush-out. We recommend calling ahead so we can set aside extra time for your feline friend." },
  ],
  HVAC: [
    { user: "My AC isn't blowing cold air. Can you come today?", assistant: "Sorry to hear that! We offer same-day emergency AC repair when available. Let me get a few details -- what's your address and what type of AC system do you have? We'll get a technician out to you as soon as possible." },
    { user: "How much does a furnace tune-up cost?", assistant: "Our furnace tune-up runs $89-$129 and includes a full inspection, filter replacement, and safety check. We recommend scheduling one before winter hits. Want me to find you an available time?" },
  ],
  Dental: [
    { user: "Do you accept Delta Dental insurance?", assistant: "Yes, we're in-network with Delta Dental! We also accept most major PPO plans. If you'd like, I can verify your specific coverage before your visit. Just share your member ID and I'll look it up." },
    { user: "How much is a teeth cleaning?", assistant: "A standard cleaning and exam runs $150-$250 without insurance. With most insurance plans, preventive cleanings are covered at 100%. Would you like to schedule an appointment?" },
  ],
  Cleaning: [
    { user: "How much for a deep clean of a 3-bedroom house?", assistant: "A deep clean for a 3-bedroom home typically runs $250-$400 depending on the size and condition. That includes bathrooms, kitchen, floors, dusting, and baseboards. Want me to schedule a free estimate?" },
    { user: "Do you bring your own supplies?", assistant: "Yes, we bring all our own cleaning supplies and equipment. We use eco-friendly products by default, but if you have specific preferences or allergies, just let us know and we'll accommodate." },
  ],
  default: [
    { user: "What are your hours?", assistant: "We're open Monday through Friday, 8 AM to 6 PM, and Saturday 9 AM to 3 PM. We're closed on Sundays. Is there a specific time that works best for you?" },
    { user: "How do I book an appointment?", assistant: "You can book right here in the chat, call us directly, or visit our website. What works best for you? I can check available times right now if you'd like." },
  ],
};

function getExamples(industry?: string): { user: string; assistant: string }[] {
  if (industry && INDUSTRY_EXAMPLES[industry]) return INDUSTRY_EXAMPLES[industry];
  return INDUSTRY_EXAMPLES.default;
}

export default function TestConversation({ onNext, onBack, onGoToFAQs, businessName, industry }: TestConversationProps) {
  const examples = getExamples(industry);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Hi! I'm the AI assistant for ${businessName || "your business"}. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");
    setShowExamples(false);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

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

  function loadExample(example: { user: string; assistant: string }) {
    setShowExamples(false);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: example.user },
    ]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: example.assistant },
      ]);
    }, 800);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">See Your AI in Action</h2>
        <p className="text-zinc-400 mt-1">
          This is what your customers will experience. Try it out or check the example conversations below.
        </p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-sm text-zinc-300 font-medium">{businessName || "Your Business"} AI</span>
          </div>
        </div>

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

      {showExamples && (
        <div>
          <p className="text-sm text-zinc-400 mb-3">Try these example conversations:</p>
          <div className="space-y-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => loadExample(ex)}
                className="w-full text-left px-4 py-3 bg-zinc-800 border border-zinc-700 hover:border-amber-500/30 rounded-lg transition-colors group"
              >
                <p className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  "{ex.user}"
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={onNext}
          className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-amber-600/20"
        >
          Looks Good!
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 min-h-[44px] bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onGoToFAQs || onBack}
            className="flex-1 min-h-[44px] text-zinc-400 hover:text-amber-400 font-medium rounded-lg transition-colors text-sm"
          >
            I want to change my FAQs
          </button>
        </div>
      </div>
    </div>
  );
}
