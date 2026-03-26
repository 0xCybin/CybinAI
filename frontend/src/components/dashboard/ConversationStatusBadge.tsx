interface ConversationStatusBadgeProps {
  status: "open" | "pending" | "resolved" | "closed";
  aiHandled?: boolean;
}

export function ConversationStatusBadge({ status, aiHandled }: ConversationStatusBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    open: { label: "Open", color: "bg-blue-500/20 text-blue-400" },
    pending: { label: "Pending", color: "bg-amber-500/20 text-amber-400" },
    resolved: { label: "Resolved", color: "bg-emerald-500/20 text-emerald-400" },
    closed: { label: "Closed", color: "bg-zinc-500/20 text-zinc-400" },
  };

  const c = config[status] || config.open;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${c.color}`}>
      {aiHandled && status === "resolved" ? "AI Resolved" : c.label}
    </span>
  );
}
