"use client";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "red" | "green" | "yellow" | "neutral";
}

const colorMap = {
  red: "border-danger/20 text-danger",
  green: "border-success/20 text-success",
  yellow: "border-warning/20 text-warning",
  neutral: "border-surface-light text-foreground",
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = "neutral",
}: StatsCardProps) {
  return (
    <div
      className={`rounded-xl bg-surface p-4 border ${colorMap[color]} card-hover`}
    >
      <div className="flex items-center gap-3">
        <div className="text-muted">{icon}</div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
