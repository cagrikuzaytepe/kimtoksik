import { NextResponse } from "next/server";
import { parseWhatsAppChat } from "@/lib/parser";
import { analyzeWithAI } from "@/lib/ai";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSupabase } from "@/lib/supabase";

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

    const supabase = getSupabase();
    const { error } = await supabase.from("reports").insert({
      id,
      data: report,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "rapor kaydedilemedi. tekrar dene" },
        { status: 500 }
      );
    }

    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    console.error("API error:", e);
    return NextResponse.json(
      { error: "sunucu hatasi" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id gerekli" },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select("data")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase select error:", error);
    return NextResponse.json(
      { error: "rapor yuklenemedi" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "rapor bulunamadi" },
      { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  return NextResponse.json(data.data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}