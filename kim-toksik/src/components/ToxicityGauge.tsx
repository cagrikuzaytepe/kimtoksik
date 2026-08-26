"use client";

interface ToxicityGaugeProps {
  score: number;
  label: string;
  description: string;
}

export default function ToxicityGauge({
  score,
  label,
  description,
}: ToxicityGaugeProps) {
  const getColor = (s: number) => {
    if (s <= 30)
      return { bar: "bg-success", glow: "glow-green", text: "text-success" };
    if (s <= 60)
      return { bar: "bg-warning", glow: "glow-yellow", text: "text-warning" };
    return { bar: "bg-danger", glow: "glow-red", text: "text-danger" };
  };

  const colors = getColor(score);

  return (
    <div
      className={`rounded-2xl bg-surface p-6 border border-surface-light ${colors.glow}`}
    >
      <h3 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">
        toksiklik seviyesi
      </h3>

      <div className="flex items-end gap-4 mb-4">
        <span className={`text-6xl font-bold ${colors.text}`}>{score}</span>
        <span className="text-xl text-muted mb-2">/100</span>
      </div>

      <p className={`text-lg font-semibold ${colors.text} mb-3`}>{label}</p>

      <div className="w-full h-4 rounded-full bg-surface-light overflow-hidden mb-4">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </div>
  );
}
