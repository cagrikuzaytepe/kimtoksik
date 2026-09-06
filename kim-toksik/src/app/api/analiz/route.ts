import { NextResponse } from "next/server";
import { parseWhatsAppChat } from "@/lib/parser";
import { analyzeWithAI } from "@/lib/ai";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rateLimit";
import { getSupabase } from "@/lib/supabase";

const ALLOWED_ORIGINS = [
  process.env.SITE_URL || "https://kimtoksik.lol",
  "https://kim-toksik.onrender.com",
  "http://localhost:3000",
];

// WhatsApp sohbet formatina benziyor mu?
function looksLikeWhatsAppChat(content: string): boolean {
  const firstLines = content.slice(0, 500);
  // WhatsApp tarih formati: DD.MM.YYYY HH:MM veya MM/DD/YY, HH:MM
  const whatsappDatePattern = /\d{1,2}[./]\d{1,2}[./]\d{2,4}[, ]+\d{1,2}:\d{2}/;
  return whatsappDatePattern.test(firstLines);
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function getClientIP(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const requestId = nanoid(8);

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const ip = getClientIP(request);

  // Rate limit: IP basina 5 istek / dakika
  const rl = await checkRateLimit(ip, 5, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "cok fazla istek gonderdin. " + Math.ceil(rl.retryAfterMs / 1000) + " sn bekle",
      },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    // Request body boyut kontrolu (content-length header)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "istek cok buyuk" },
        { status: 413, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { content } = body;

    // Content validasyonu
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "gecerli bir sohbet dosyasi gerekli" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Bos veya cok kisa content
    if (content.trim().length < 50) {
      return NextResponse.json(
        { error: "dosya cok kucuk" },
        { status: 400, headers: corsHeaders }
      );
    }

    // WhatsApp formati kontrolu
    if (!looksLikeWhatsAppChat(content)) {
      return NextResponse.json(
        { error: "bu bir whatsapp sohbeti gibi gozukmuyor" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Potansiyel zararli content temizligi
    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // XSS korumasi
      .replace(/javascript:/gi, "") // JS injection korumasi
      .slice(0, 5 * 1024 * 1024); // 5MB ile sinirla (buyukluk kontrolu)

    let chatStats;
    try {
      chatStats = parseWhatsAppChat(sanitizedContent);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "sohbet okunamadi",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    let aiReport;
    try {
      aiReport = await analyzeWithAI(chatStats);
    } catch (e) {
      console.error(`[${requestId}] AI error:`, e);
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "analiz sirasinda bir seyler ters gitti",
        },
        { status: 500, headers: corsHeaders }
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
      console.error(`[${requestId}] Supabase error:`, error);
      return NextResponse.json(
        { error: "rapor kaydedilemedi. tekrar dene" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(report, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    console.error(`[${requestId}] API error:`, e);
    return NextResponse.json(
      { error: "sunucu hatasi" },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id gerekli" },
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  // ID formati kontrolu (nanoid 10 karakter)
  if (id.length !== 10 || !/^[a-zA-Z0-9]+$/.test(id)) {
    return NextResponse.json(
      { error: "gecersiz rapor id" },
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, max-age=0",
        },
      }
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
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "rapor bulunamadi" },
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  return NextResponse.json(data.data, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
