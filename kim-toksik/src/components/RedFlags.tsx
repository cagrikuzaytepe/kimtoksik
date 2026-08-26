"use client";

import type { RedFlag } from "@/lib/types";

interface RedFlagsProps {
  flags: RedFlag[];
}

export default function RedFlags({ flags }: RedFlagsProps) {
  const severityConfig = {
    low: {
      bg: "bg-warning/10",
      border: "border-warning/20",
      badge: "bg-warning/20 text-warning",
    },
    medium: {
      bg: "bg-accent/10",
      border: "border-accent/20",
      badge: "bg-accent/20 text-accent",
    },
    high: {
      bg: "bg-danger/10",
      border: "border-danger/20",
      badge: "bg-danger/20 text-danger",
    },
  };

  return (
    <div className="rounded-2xl bg-surface p-6 border border-surface-light">
      <h3 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">
        red flagler
      </h3>

      <div className="space-y-3">
        {flags.map((flag, i) => {
          const config = severityConfig[flag.severity];
          return (
            <div
              key={i}
              className={`p-4 rounded-xl ${config.bg} border ${config.border} card-hover`}
            >
              <div className="flex items-start gap-3">
                <div className="text-lg font-bold text-muted mt-0.5">
                  {i + 1}.
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{flag.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.badge}`}
                    >
                      {flag.severity === "high"
                        ? "kritic"
                        : flag.severity === "medium"
                          ? "orta"
                          : "hafif"}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    {flag.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
