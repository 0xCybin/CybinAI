interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "green" | "yellow" | "red" | "blue";
}

export function SummaryCard({ title, value, subtitle, trend, trendValue, color = "blue" }: SummaryCardProps) {
  const colors = {
    green: "border-emerald-500/20",
    yellow: "border-amber-500/20",
    red: "border-red-500/20",
    blue: "border-blue-500/20",
  };

  const accentDots = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-zinc-400",
  };

  return (
    <div className={`bg-zinc-900 rounded-xl p-5 border ${colors[color]} transition-colors hover:border-zinc-700`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-1.5 h-1.5 rounded-full ${accentDots[color]}`} />
        <p className="text-sm text-zinc-400">{title}</p>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1.5">{subtitle}</p>}
      {trend && trendValue && (
        <p className={`text-xs mt-1.5 ${trendColors[trend]}`}>
          {trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2192"} {trendValue}
        </p>
      )}
    </div>
  );
}
