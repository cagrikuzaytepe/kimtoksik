"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Report from "@/components/Report";
import type { ChatStats, AIReport } from "@/lib/types";

interface ReportData {
  id: string;
  createdAt: string;
  chatStats: ChatStats;
  aiReport: AIReport;
}

function deserializeDates(data: ReportData): ReportData {
  data.chatStats.dateRange.start = new Date(
    data.chatStats.dateRange.start
  );
  data.chatStats.dateRange.end = new Date(
    data.chatStats.dateRange.end
  );
  for (const msg of data.chatStats.sampleMessages) {
    msg.date = new Date(msg.date);
  }
  return data;
}

export default function AnalizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      // SessionStorage'dan kontrol et
      const cached = sessionStorage.getItem(`report-${id}`);
      if (cached) {
        try {
          const data = deserializeDates(JSON.parse(cached) as ReportData);
          if (!cancelled) {
            setReport(data);
            setLoading(false);
          }
          return;
        } catch {
          // Fall through to API
        }
      }

      // API'den yukle
      try {
        const res = await fetch(`/api/analiz?id=${id}`);
        if (!res.ok) throw new Error("rapor bulunamadi");
        const data = deserializeDates(await res.json());
        if (!cancelled) {
          setReport(data);
        }
      } catch {
        if (!cancelled) {
          setError("rapor yuklenemedi. tekrar dene.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-lg font-medium">rapor hazirlaniyor...</p>
          <p className="text-sm text-muted mt-2">sabir, cozuyoruz</p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-6 text-muted">x</div>
          <h1 className="text-2xl font-bold mb-2">bir seyler ters gitti</h1>
          <p className="text-muted mb-6">{error || "rapor bulunamadi"}</p>
          <Link
            href="/"
            className="inline-block py-3 px-6 rounded-xl bg-accent text-white font-semibold hover:bg-accent-dark transition-colors"
          >
            basa don
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <Report chatStats={report.chatStats} aiReport={report.aiReport} />
    </main>
  );
}
