"use client";

import { useEffect, useState } from "react";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQBuilderProps {
  onNext: (faqs: FAQ[]) => void;
  onBack: () => void;
  defaults?: any[];
  industry?: string;
}

const emptyFAQ = (): FAQ => ({ question: "", answer: "" });

export default function FAQBuilder({ onNext, onBack, defaults, industry }: FAQBuilderProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([emptyFAQ()]);
  const [hasDefaults, setHasDefaults] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    if (defaults && defaults.length > 0) {
      setFaqs(
        defaults.map((d) => ({
          question: d.question || "",
          answer: d.answer || "",
        }))
      );
      setHasDefaults(true);
      setExpandedIndex(0);
    }
  }, [defaults]);

  function update(index: number, field: keyof FAQ, value: string) {
    setFaqs((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  }

  function addRow() {
    const newIndex = faqs.length;
    setFaqs((prev) => [...prev, emptyFAQ()]);
    setExpandedIndex(newIndex);
  }

  function removeRow(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    else if (expandedIndex !== null && expandedIndex > index) setExpandedIndex(expandedIndex - 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = faqs.filter((f) => f.question.trim());
    onNext(filled);
  }

  const industryLabel = industry ? industry.toLowerCase() : "your industry";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
        {hasDefaults ? (
          <p className="text-zinc-400 mt-1">
            These are the questions {industryLabel} customers ask most. Edit the answers to match your business.
          </p>
        ) : (
          <p className="text-zinc-400 mt-1">
            What questions do your customers ask most? Your AI will use these to answer instantly.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-750"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <p className="text-white font-medium text-sm flex-1 truncate">
                  {faq.question || `Question ${i + 1} (click to edit)`}
                </p>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeRow(i); }}
                    className="px-2 py-1 text-zinc-500 hover:text-red-400 transition-colors text-xs"
                    title="Remove"
                  >
                    Remove
                  </button>
                  <svg
                    className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-700">
                  <div className="pt-3">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Question</label>
                    <input
                      value={faq.question}
                      onChange={(e) => update(i, "question", e.target.value)}
                      placeholder="e.g. Do you offer same-day service?"
                      className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Answer</label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => update(i, "answer", e.target.value)}
                      placeholder="Write the answer as if you were talking to a customer. Be specific -- include hours, prices, or anything they'd need to know."
                      rows={4}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-sm resize-y transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full min-h-[48px] border-2 border-dashed border-zinc-600 rounded-lg text-amber-500 hover:text-amber-400 hover:border-amber-500/50 transition-colors text-sm font-medium"
      >
        + Add Another Question
      </button>

      <div className="px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
        <p className="text-sm text-zinc-400">
          The more accurate these answers are, the better your AI will handle customer questions.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 min-h-[48px] bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-amber-600/20"
        >
          Next: Channels
        </button>
      </div>
    </form>
  );
}
