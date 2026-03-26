interface AIConfidenceBadgeProps {
  score: number | null;
  level: "high" | "medium" | "low" | null;
}

export function AIConfidenceBadge({ score, level }: AIConfidenceBadgeProps) {
  if (!level || score === null) return null;

  const config = {
    high: {
      label: "AI Handled",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "\u2713",
    },
    medium: {
      label: "Review Suggested",
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: "~",
    },
    low: {
      label: "Needs Attention",
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: "!",
    },
  };

  const c = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${c.color}`}
      title={`AI confidence: ${Math.round(score * 100)}%`}
    >
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}
