interface ChannelIconProps {
  channel: "chat" | "email" | "sms" | "phone";
  size?: number;
}

export function ChannelIcon({ channel, size = 16 }: ChannelIconProps) {
  const icons: Record<string, { symbol: string; color: string }> = {
    chat: { symbol: "\uD83D\uDCAC", color: "text-blue-400" },
    email: { symbol: "\uD83D\uDCE7", color: "text-purple-400" },
    sms: { symbol: "\uD83D\uDCF1", color: "text-green-400" },
    phone: { symbol: "\uD83D\uDCDE", color: "text-amber-400" },
  };

  const icon = icons[channel] || icons.chat;

  return (
    <span
      className={`inline-flex items-center justify-center ${icon.color}`}
      style={{ fontSize: size * 0.75 }}
      title={channel}
      role="img"
      aria-label={`${channel} channel`}
    >
      {icon.symbol}
    </span>
  );
}
