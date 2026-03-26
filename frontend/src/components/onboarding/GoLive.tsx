"use client";

import { useState } from "react";

interface GoLiveProps {
  data: {
    businessInfo?: any;
    services?: any[];
    faqs?: any[];
    channels?: Record<string, boolean>;
  };
  onComplete: () => void;
  onBack: () => void;
}

export default function GoLive({ data, onComplete, onBack }: GoLiveProps) {
  const [copied, setCopied] = useState(false);

  const businessName = data.businessInfo?.business_name || "Your Business";
  const enabledChannels = Object.entries(data.channels || {})
    .filter(([, v]) => v)
    .map(([k]) => k.replace("_", " "))
    .join(", ") || "None";
  const servicesCount = data.services?.length ?? 0;
  const faqsCount = data.faqs?.length ?? 0;

  const embedCode = `<script src="https://cdn.cybinai.com/widget.js" data-business="${businessName.replace(/"/g, "").toLowerCase().replace(/\s+/g, "-")}" defer></script>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white">Your AI assistant is ready!</h2>
        <p className="text-zinc-400 mt-1">Here's a summary of what you've set up.</p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg divide-y divide-zinc-700">
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-zinc-400 text-sm">Business</span>
          <span className="text-white font-medium">{businessName}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-zinc-400 text-sm">Active Channels</span>
          <span className="text-white font-medium capitalize">{enabledChannels}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-zinc-400 text-sm">Services</span>
          <span className="text-white font-medium">{servicesCount}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-zinc-400 text-sm">FAQs</span>
          <span className="text-white font-medium">{faqsCount}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Widget Embed Code
        </label>
        <p className="text-xs text-zinc-500 mb-2">
          Paste this snippet before the closing <code className="text-zinc-400">&lt;/body&gt;</code> tag on your website.
        </p>
        <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <code className="text-xs text-green-400 break-all font-mono leading-relaxed">{embedCode}</code>
          <button
            type="button"
            onClick={copyEmbed}
            className="absolute top-3 right-3 min-h-[32px] px-3 bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 rounded-md transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
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
          onClick={onComplete}
          className="flex-1 min-h-[48px] bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
