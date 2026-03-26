"use client";

import { useState } from "react";

interface ChannelSetupProps {
  onNext: (channels: any) => void;
  onBack: () => void;
}

interface Channel {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  comingSoon?: boolean;
}

export default function ChannelSetup({ onNext, onBack }: ChannelSetupProps) {
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: "web_chat",
      label: "Web Chat",
      description: "Embed a chat widget on your website",
      enabled: true,
      disabled: false,
    },
    {
      id: "email",
      label: "Email",
      description: "Handle customer emails automatically",
      enabled: false,
      disabled: false,
    },
    {
      id: "phone",
      label: "Phone",
      description: "AI-powered phone answering",
      enabled: false,
      disabled: true,
      comingSoon: true,
    },
    {
      id: "sms",
      label: "SMS",
      description: "Two-way text message support",
      enabled: false,
      disabled: true,
      comingSoon: true,
    },
  ]);

  function toggle(id: string) {
    setChannels((prev) =>
      prev.map((c) => (c.id === id && !c.disabled ? { ...c, enabled: !c.enabled } : c))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result: Record<string, boolean> = {};
    channels.forEach((c) => {
      result[c.id] = c.enabled;
    });
    onNext(result);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Choose Your Channels</h2>
        <p className="text-zinc-400 mt-1">
          Where do you want your AI assistant to help customers?
        </p>
      </div>

      <div className="space-y-3">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className={`flex items-center justify-between p-4 rounded-lg border transition-colors
              ${channel.disabled
                ? "bg-zinc-800/50 border-zinc-700/50 opacity-60"
                : channel.enabled
                ? "bg-zinc-800 border-blue-500/50"
                : "bg-zinc-800 border-zinc-700"
              }
            `}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{channel.label}</span>
                {channel.comingSoon && (
                  <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">{channel.description}</p>
            </div>

            <button
              type="button"
              onClick={() => toggle(channel.id)}
              disabled={channel.disabled}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none
                ${channel.disabled ? "cursor-not-allowed" : "cursor-pointer"}
                ${channel.enabled ? "bg-blue-600" : "bg-zinc-600"}
              `}
              role="switch"
              aria-checked={channel.enabled}
            >
              <span
                className={`inline-block h-5 w-5 mt-1 rounded-full bg-white shadow transition-transform
                  ${channel.enabled ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
        ))}
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
          className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Next: Test Your AI
        </button>
      </div>
    </form>
  );
}
