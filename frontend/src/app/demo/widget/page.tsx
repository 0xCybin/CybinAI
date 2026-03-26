'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatWidget from '@/components/chat/ChatWidget';
import '@/styles/design-system.css';

const DEMO_TENANT_ID = '85d0a74f-ee20-47e1-9113-52f4dae1b4ed';

export default function WidgetDemoPage() {
  const [copied, setCopied] = useState(false);
  const [businessSlug, setBusinessSlug] = useState('your-business');

  useEffect(() => {
    // Try to get real tenant name from stored data
    try {
      const token = localStorage.getItem('cybinai_access_token') || localStorage.getItem('access_token');
      if (token) {
        // Decode JWT to get tenant info (best effort)
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.tenant_name) {
          setBusinessSlug(payload.tenant_name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
        }
      }
    } catch {}
  }, []);

  const embedCode = `<script src="https://cdn.cybinai.com/widget.js" data-business="${businessSlug}" defer></script>`;

  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Chat Widget Preview</h1>
            <p className="text-sm text-zinc-400">This is exactly what your customers see. Try asking a question.</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg border border-zinc-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Demo Area */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">
            Click the chat button in the bottom-right corner to open the widget. Type any question a customer might ask -- about your services, pricing, hours, or anything else. This is the same widget that will appear on your website.
          </p>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
            <p className="text-sm text-amber-200">
              The chat button is in the bottom-right corner of this page.
            </p>
          </div>
        </div>

        {/* Embed Code Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-1">Add this to your website</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Paste this code before the closing <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag on your website. Your AI will start answering customers immediately.
          </p>
          <div className="relative bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <code className="text-sm text-emerald-400 break-all font-mono leading-relaxed block pr-24">{embedCode}</code>
            <button
              onClick={copyEmbed}
              className="absolute top-3 right-3 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            If you're not sure how to add code to your website, send this snippet to whoever manages your site. They'll know what to do.
          </p>
        </div>
      </div>

      {/* The Chat Widget */}
      <ChatWidget tenantId={DEMO_TENANT_ID} />
    </div>
  );
}
