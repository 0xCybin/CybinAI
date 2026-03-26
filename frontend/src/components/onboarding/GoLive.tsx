"use client";

import { useState } from "react";
import Link from "next/link";

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
  const servicesCount = data.services?.length ?? 0;
  const faqsCount = data.faqs?.length ?? 0;
  const enabledChannels = Object.entries(data.channels || {})
    .filter(([, v]) => v)
    .map(([k]) => k.replace("_", " "));
  const channelCount = enabledChannels.length;

  const embedCode = `<script src="https://cdn.cybinai.com/widget.js" data-business="${businessName.replace(/"/g, "").toLowerCase().replace(/\s+/g, "-")}" defer></script>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-8">
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white">Your AI assistant is ready!</h2>
        <p className="text-zinc-400 mt-2 text-lg">
          {businessName} is all set to start helping customers.
        </p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg divide-y divide-zinc-700">
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-zinc-400 text-sm">Services loaded</span>
          <span className="text-white font-semibold">{servicesCount}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-zinc-400 text-sm">FAQs loaded</span>
          <span className="text-white font-semibold">{faqsCount}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <span className="text-zinc-400 text-sm">Channels active</span>
          <span className="text-white font-semibold capitalize">{channelCount > 0 ? enabledChannels.join(", ") : "None"}</span>
        </div>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-5">
        <h3 className="text-white font-semibold mb-1">Add this to your website</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Paste this code before the closing <code className="text-zinc-300 bg-zinc-700 px-1.5 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag on your website. Your AI will start answering customers immediately.
        </p>
        <div className="relative bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <code className="text-sm text-emerald-400 break-all font-mono leading-relaxed block pr-20">{embedCode}</code>
          <button
            type="button"
            onClick={copyEmbed}
            className="absolute top-3 right-3 min-h-[36px] px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          If you're not sure how to add code to your website, send this snippet to whoever manages your site. They'll know what to do.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onComplete}
          className="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors text-lg"
        >
          Go to Dashboard
        </button>

        <div className="flex items-center justify-center gap-6">
          <Link
            href="/demo/widget"
            className="text-sm text-amber-500 hover:text-amber-400 font-medium transition-colors"
          >
            Test it yourself first
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
