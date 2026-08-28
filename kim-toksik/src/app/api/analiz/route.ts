import { NextResponse } from "next/server";
import { parseWhatsAppChat } from "@/lib/parser";
import { analyzeWithAI } from "@/lib/ai";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rateLimit";

const reportStore = new Map<string, unknown>();

function getClientIP(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIP(request);

  // Rate limit: IP basina 5 istek / dakika
  const rl = checkRateLimit(ip, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "cok fazla istek gonderdin. " + Math.ceil(rl.retryAfterMs / 1000) + " sn bekle",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "gecerli bir sohbet dosyasi gerekli" },
        { status: 400 }
      );
    }

    if (content.length > 2_000_000) {
      return NextResponse.json(
        { error: "dosya cok buyuk. 2MB'dan kucuk olmali" },
        { status: 400 }
      );
    }

    let chatStats;
    try {
      chatStats = parseWhatsAppChat(content);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "sohbet okunamadi",
        },
        { status: 400 }
      );
    }

    let aiReport;
    try {
      aiReport = await analyzeWithAI(chatStats);
    } catch (e) {
      console.error("AI analysis error:", e);
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "analiz sirasinda bir seyler ters gitti",
        },
        { status: 500 }
      );
    }

    const id = nanoid(10);
    const report = {
      id,
      createdAt: new Date().toISOString(),
      chatStats,
      aiReport,
    };

    reportStore.set(id, report);

    // Eski raporlari temizle (max 200 tut)
    if (reportStore.size > 200) {
      const firstKey = reportStore.keys().next().value;
      if (firstKey) reportStore.delete(firstKey);
    }

    return NextResponse.json(report);
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json(
      { error: "sunucu hatasi" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }

  const report = reportStore.get(id);
  if (!report) {
    return NextResponse.json(
      { error: "rapor bulunamadi" },
      { status: 404 }
    );
  }

  return NextResponse.json(report);
}
