import type { ChatStats, AIReport } from "./types";
import { buildAnalysisPrompt } from "./prompts";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Model siralamasi: once en az yogun olan, sonra digerleri
const MODELS = [
  "gemini-3.5-flash-lite",  // 1. sirada: en hizli, en az yogun
  "gemini-3.5-flash",       // 2. sirada: dengeli
  "gemini-2.5-flash",       // 3. sirada: backup
];

export async function analyzeWithAI(stats: ChatStats): Promise<AIReport> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY ayarlanmamis");
  }

  // Buyuk dosyalarda promptu kisitla (token limitini asmamak icin)
  const trimmedStats = trimStatsForLargeInput(stats);
  const prompt = buildAnalysisPrompt(trimmedStats);

  console.log(`Prompt boyutu: ${prompt.length} chars, Buyuk dosya: ${stats.isLargeChat}`);

  let text: string | null = null;

  // Her modeli dene - timeout yok, model basarisiz olursa digerine gec
  for (const model of MODELS) {
    console.log(`Model deneniyor: ${model}`);

    // 1. dene: JSON mode ile
    text = await callGemini(prompt, true, model);

    // e bos geldi veya JSON icermediyse, JSON mode olmadan dene
    if (!text || !text.includes("{")) {
      console.warn(`${model} - JSON mode bos geldi, normal mod ile deneniyor...`);
      text = await callGemini(prompt, false, model);
    }

    if (text && text.includes("{")) {
      console.log(`${model} basarili!`);
      break;
    }

    console.warn(`${model} basarisiz, siradaki modele geciliyor...`);
    text = null;
  }

  if (!text) {
    // Tum modeller basarisiz - kullaniciya dostane hata
    throw new Error("Analiz su an yapilamiyor. Lutfen biraz bekleyip tekrar deneyin.");
  }

  // JSON cikar
  const parsed = extractJSON(text);
  if (!parsed) {
    console.error("JSON parse basarisiz. Raw:", text.slice(0, 500));
    throw new Error("Analiz su an yapilamiyor. Lutfen biraz bekleyip tekrar deneyin.");
  }

  if (typeof parsed.toxicityScore !== "number") {
    parsed.toxicityScore = 50;
  }
  parsed.toxicityScore = Math.max(0, Math.min(100, parsed.toxicityScore));
  if (!parsed.toxicityLabel) parsed.toxicityLabel = "belirsiz";
  if (!parsed.verdict) parsed.verdict = "beraberlik";
  if (!Array.isArray(parsed.redFlags)) parsed.redFlags = [];
  if (!Array.isArray(parsed.whoChases)) parsed.whoChases = [];
  if (!parsed.whoChasesDescription) parsed.whoChasesDescription = "";
  if (!parsed.toxicityDescription) parsed.toxicityDescription = "";
  if (!parsed.verdictDescription) parsed.verdictDescription = "";
  if (!parsed.funFact) parsed.funFact = "";

  return parsed as AIReport;
}

// Buyuk dosyalarda istatistikleri kisitla (token tasarrufu)
function trimStatsForLargeInput(stats: ChatStats): ChatStats {
  const trimmed = { ...stats };

  // Sample mesajlari sinirla
  const maxSamples = stats.isLargeChat ? 5 : 8;
  if (trimmed.sampleMessages.length > maxSamples) {
    trimmed.sampleMessages = trimmed.sampleMessages.slice(0, maxSamples);
  }

  // Toxicity signal'larini sinirla
  const maxSignals = stats.isLargeChat ? 3 : 5;
  if (trimmed.toxicitySignals.length > maxSignals) {
    trimmed.toxicitySignals = trimmed.toxicitySignals.slice(0, maxSignals);
  }

  // Ornek mesaj uzunlugunu sinirla
  const maxMsgLen = stats.isLargeChat ? 60 : 100;
  trimmed.sampleMessages = trimmed.sampleMessages.map((m) => ({
    ...m,
    message: m.message.slice(0, maxMsgLen),
  }));

  // Signal aciklamalarini kisalt
  trimmed.toxicitySignals = trimmed.toxicitySignals.map((s) => ({
    ...s,
    description: s.description.slice(0, stats.isLargeChat ? 60 : 100),
  }));

  return trimmed;
}

async function callGemini(
  prompt: string,
  jsonResponse: boolean,
  model: string
): Promise<string | null> {
  const config: Record<string, unknown> = {
    maxOutputTokens: 8192,
  };
  if (jsonResponse) {
    config.responseMimeType = "application/json";
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: config,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`Gemini API error (${model}):`, res.status, err.slice(0, 300));
      return null;
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (e) {
    console.error(`Gemini fetch error (${model}):`, e);
    return null;
  }
}

function extractJSON(text: string): AIReport | null {
  // 1. direkt parse dene
  try {
    return JSON.parse(text);
  } catch {
    // devam
  }

  // 2. { ile baslayip } ile biten en buyuk parcayi bul
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    // devam
  }

  // 3. kademeli olarak kucult
  for (let end = lastBrace; end > firstBrace; end--) {
    const sub = text.slice(firstBrace, end + 1);
    if (sub.endsWith("}")) {
      try {
        return JSON.parse(sub);
      } catch {
        // devam
      }
    }
  }

  return null;
}
