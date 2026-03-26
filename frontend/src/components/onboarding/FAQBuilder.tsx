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
}

const emptyFAQ = (): FAQ => ({ question: "", answer: "" });

export default function FAQBuilder({ onNext, onBack, defaults }: FAQBuilderProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([emptyFAQ()]);

  useEffect(() => {
    if (defaults && defaults.length > 0) {
      setFaqs(
        defaults.map((d) => ({
          question: d.question || "",
          answer: d.answer || "",
        }))
      );
    }
  }, [defaults]);

  function update(index: number, field: keyof FAQ, value: string) {
    setFaqs((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  }

  function addRow() {
    setFaqs((prev) => [...prev, emptyFAQ()]);
  }

  function removeRow(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filled = faqs.filter((f) => f.question.trim());
    onNext(filled);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Frequently Asked Questions</h2>
        <p className="text-zinc-400 mt-1">
          What questions do your customers ask most? Your AI will use these to answer instantly.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Question</label>
                <input
                  value={faq.question}
                  onChange={(e) => update(i, "question", e.target.value)}
                  placeholder="e.g. Do you offer same-day service?"
                  className="w-full min-h-[44px] px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="self-start mt-5 min-h-[44px] px-3 text-zinc-500 hover:text-red-400 transition-colors text-lg"
                title="Remove"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Answer</label>
              <textarea
                value={faq.answer}
                onChange={(e) => update(i, "answer", e.target.value)}
                placeholder="e.g. Yes, we offer same-day appointments based on availability. Call us to check!"
                rows={3}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full min-h-[44px] border border-dashed border-zinc-600 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors text-sm"
      >
        + Add Question
      </button>

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
          className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Next: Channels
        </button>
      </div>
    </form>
  );
}
