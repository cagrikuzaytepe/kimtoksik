"use client";

import { useRef, useState } from "react";
import type { ChatStats, AIReport } from "@/lib/types";
import ToxicityGauge from "./ToxicityGauge";
import RedFlags from "./RedFlags";
import StatsCard from "./StatsCard";

interface ReportProps {
  chatStats: ChatStats;
  aiReport: AIReport;
}

function formatDuration(ms: number): string {
  if (ms === 0) return "N/A";
  const minutes = Math.round(ms / 1000 / 60);
  if (minutes < 60) return minutes + " dk";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours + "sa " + mins + "dk";
}

export default function Report({ chatStats, aiReport }: ReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const personNames = Object.keys(chatStats.persons);
  const person1 = chatStats.persons[personNames[0]];
  const person2 = chatStats.persons[personNames[1]];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div ref={reportRef} className="w-full max-w-2xl mx-auto space-y-6">
      {/* header */}
      <div className="text-center py-8 animate-fade-in-up">
        <div className="inline-block px-4 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4 tracking-wider uppercase">
          analiz tamam
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">
          {personNames[0]} <span className="text-accent">&times;</span>{" "}
          {personNames[1]}
        </h1>
        <p className="text-sm text-muted">
          {chatStats.dateRange.start.toLocaleDateString("tr-TR")} &mdash;{" "}
          {chatStats.dateRange.end.toLocaleDateString("tr-TR")} &bull;{" "}
          {chatStats.totalDays} gun
        </p>
      </div>

      {/* quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up animation-delay-100">
        <StatsCard
          icon={<span className="text-lg">~</span>}
          title="toplam mesaj"
          value={chatStats.totalMessages.toLocaleString("tr-TR")}
        />
        <StatsCard
          icon={<span className="text-lg">/</span>}
          title="gunluk ort."
          value={chatStats.messagesPerDay}
          subtitle="mesaj/gun"
        />
        <StatsCard
          icon={<span className="text-lg">&lt;</span>}
          title={person1.name + " yanit"}
          value={formatDuration(person1.avgReplyMs)}
          subtitle="ort. sure"
        />
        <StatsCard
          icon={<span className="text-lg">&gt;</span>}
          title={person2.name + " yanit"}
          value={formatDuration(person2.avgReplyMs)}
          subtitle="ort. sure"
        />
      </div>

      {/* toxicity */}
      <div className="animate-fade-in-up animation-delay-200">
        <ToxicityGauge
          score={aiReport.toxicityScore}
          label={aiReport.toxicityLabel}
          description={aiReport.toxicityDescription}
        />
      </div>

      {/* who chases */}
      <div className="rounded-2xl bg-surface p-6 border border-surface-light animate-fade-in-up animation-delay-300">
        <h3 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">
          kim kovaliyor?
        </h3>

        <div className="flex items-center gap-4 mb-4">
          {aiReport.whoChases.map((person, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="text-2xl font-bold text-accent">
                %{person.percentage}
              </div>
              <div className="text-sm text-muted mt-1">{person.name}</div>
            </div>
          ))}
        </div>

        <div className="w-full h-3 rounded-full bg-surface-light overflow-hidden flex">
          <div
            className="h-full bg-accent rounded-l-full"
            style={{ width: `${aiReport.whoChases[0]?.percentage || 50}%` }}
          />
          <div
            className="h-full bg-muted rounded-r-full"
            style={{ width: `${aiReport.whoChases[1]?.percentage || 50}%` }}
          />
        </div>

        <p className="text-sm text-muted mt-4 leading-relaxed">
          {aiReport.whoChasesDescription}
        </p>
      </div>

      {/* comparison */}
      <div className="rounded-2xl bg-surface p-6 border border-surface-light animate-fade-in-up animation-delay-400">
        <h3 className="text-sm font-medium text-muted mb-4 uppercase tracking-wider">
          kiyaslama
        </h3>

        <div className="space-y-4">
          {[
            {
              label: "mesaj sayisi",
              val1: person1.messageCount,
              val2: person2.messageCount,
            },
            {
              label: "ort. mesaj uzunlugu",
              val1: Math.round(person1.avgMessageLength),
              val2: Math.round(person2.avgMessageLength),
              suffix: " karakter",
            },
            {
              label: "emoji kullanimi",
              val1: person1.emojiCount,
              val2: person2.emojiCount,
            },
            {
              label: "gece mesaji",
              val1: person1.lateNightMessages,
              val2: person2.lateNightMessages,
            },
            {
              label: "soru sayisi",
              val1: person1.questionCount,
              val2: person2.questionCount,
            },
          ].map((stat, i) => {
            const total = stat.val1 + stat.val2;
            const p1 = total > 0 ? (stat.val1 / total) * 100 : 50;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>{stat.label}</span>
                  <span>
                    {stat.val1}
                    {stat.suffix || ""} vs {stat.val2}
                    {stat.suffix || ""}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-light overflow-hidden flex">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${p1}%` }}
                  />
                  <div
                    className="h-full bg-muted"
                    style={{ width: `${100 - p1}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* red flags */}
      <div className="animate-fade-in-up animation-delay-500">
        <RedFlags flags={aiReport.redFlags} />
      </div>

      {/* fun fact */}
      <div className="rounded-2xl bg-surface p-6 border border-surface-light">
        <h3 className="text-sm font-medium text-muted mb-2 uppercase tracking-wider">
          bir de boyle dusun
        </h3>
        <p className="text-lg font-medium">{aiReport.funFact}</p>
      </div>

      {/* verdict - "son soz" */}
      <div className="rounded-2xl bg-surface p-8 border border-surface-light text-center glow-red">
        <h3 className="text-sm font-medium text-muted mb-2 uppercase tracking-wider">
          son soz
        </h3>
        <p className="text-3xl font-bold mb-4">{aiReport.verdict}</p>
        <p className="text-sm text-muted leading-relaxed max-w-lg mx-auto">
          {aiReport.verdictDescription}
        </p>
      </div>

      {/* actions */}
      <div className="flex flex-col sm:flex-row gap-3 pb-12">
        <button
          onClick={handleCopyLink}
          className="flex-1 py-3 px-6 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark transition-colors"
        >
          {copied ? "kopyalandi!" : "sonucu paylas"}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 py-3 px-6 rounded-xl bg-surface border border-surface-light font-semibold hover:bg-surface-light transition-colors"
        >
          yeni analiz
        </button>
      </div>

      <div className="text-center py-4 text-xs text-muted/50">
        kim toksik
      </div>
    </div>
  );
}
