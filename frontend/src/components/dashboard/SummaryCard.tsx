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
    green: "border-emerald-500/30",
    yellow: "border-amber-500/30",
    red: "border-red-500/30",
    blue: "border-blue-500/30",
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-zinc-400",
  };

  return (
    <div className={`bg-zinc-800 rounded-lg p-4 border ${colors[color]}`}>
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      {trend && trendValue && (
        <p className={`text-xs mt-1 ${trendColors[trend]}`}>
          {trend === "up" ? "\u2191" : trend === "down" ? "\u2193" : "\u2192"} {trendValue}
        </p>
      )}
    </div>
  );
}
