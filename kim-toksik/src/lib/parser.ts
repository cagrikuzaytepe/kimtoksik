import * as whatsapp from "whatsapp-chat-parser";
import type {
  ParsedMessage,
  ChatStats,
  PersonStats,
  ToxicitySignal,
  SampleMessage,
} from "./types";

const SYSTEM_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /created group/i,
  /added you/i,
  /left/i,
  /changed the subject/i,
  /changed this group/i,
  /changed the group/i,
  /removed/i,
  /joined using/i,
  /changed their phone number/i,
  /deleted this message/i,
  /you deleted/i,
  /waiting for this message/i,
  /media omitted/i,
  /<Media omitted>/i,
  /image omitted/i,
  /video omitted/i,
  /audio omitted/i,
  /sticker omitted/i,
  /document omitted/i,
  /GIF omitted/i,
  /this message was deleted/i,
  /you were added/i,
  /security code changed/i,
  /call ended/i,
  /missed (voice|video) call/i,
];

const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{20E3}\u{E0020}-\u{E007F}]/gu;

const GREETINGS = [
  "merhaba", "selam", "hey", "nabır", "naber",
  "gunayd\u0131n", "iyi geceler", "iyi ak\u015Famlar",
  "good morning", "good night", "hello", "hi",
  "how are you", "n'aber", "selamlar",
];

// Buyuk dosyalar icin ornekleme threshold
const LARGE_CHAT_THRESHOLD = 50000;
const SAMPLE_SIZE = 10000;

function isSystemMessage(msg: string): boolean {
  return SYSTEM_PATTERNS.some((p) => p.test(msg));
}

function countEmojis(text: string): number {
  return (text.match(EMOJI_REGEX) || []).length;
}

function isGreeting(msg: string): boolean {
  const lower = msg.toLowerCase().trim();
  return GREETINGS.some((g) => lower.startsWith(g) || lower === g);
}

function isQuestion(msg: string): boolean {
  return (
    msg.includes("?") ||
    /\b(ne|nasıl|neden|niye|nerede|kim|hangi|kaç)\b/i.test(msg)
  );
}

function isLateNight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 0 && hour < 6;
}

// Buyuk dosyalarda rastgele ornek sec
function sampleMessages(messages: ParsedMessage[], size: number): ParsedMessage[] {
  if (messages.length <= size) return messages;
  const step = messages.length / size;
  const sampled: ParsedMessage[] = [];
  for (let i = 0; i < messages.length && sampled.length < size; i += step) {
    sampled.push(messages[Math.floor(i)]);
  }
  return sampled;
}

// Tek pass ile tum istatistikleri hesapla (O(n) complexity)
function computeStatsInSinglePass(
  userMessages: ParsedMessage[],
  persons: string[]
) {
  const personStats: Record<string, PersonStats> = {};
  const conversationStarters: Record<string, number> = {};
  const hourlyDist = new Array(24).fill(0);
  const replyTimes: Record<string, number[]> = {};
  const emojiMap: Record<string, Record<string, number>> = {};

  // Init
  for (const person of persons) {
    personStats[person] = {
      name: person,
      messageCount: 0,
      avgMessageLength: 0,
      emojiCount: 0,
      mediaOmitted: 0,
      questionCount: 0,
      greetingCount: 0,
      lateNightMessages: 0,
      shortestReplyMs: 0,
      longestReplyMs: 0,
      avgReplyMs: 0,
    };
    conversationStarters[person] = 0;
    replyTimes[person] = [];
  }

  // Tarih siralamasi (tek seferde)
  const sorted = [...userMessages].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let lastAuthor: string | null = null;
  let lastTime: Date | null = null;

  // TEK PASS - tum mesajlari isle
  for (const msg of sorted) {
    if (!msg.author) continue;

    const stats = personStats[msg.author];
    if (!stats) continue;

    // Temel istatistikler
    stats.messageCount++;
    stats.avgMessageLength += msg.message.length;
    stats.emojiCount += countEmojis(msg.message);

    if (/media omitted|<media omitted>/i.test(msg.message)) {
      stats.mediaOmitted++;
    }
    if (isQuestion(msg.message)) {
      stats.questionCount++;
    }
    if (isGreeting(msg.message)) {
      stats.greetingCount++;
    }
    if (isLateNight(msg.date)) {
      stats.lateNightMessages++;
    }

    // Saat dagilimi
    hourlyDist[msg.date.getHours()]++;

    // Emoji haritasi
    const emojis = msg.message.match(EMOJI_REGEX);
    if (emojis) {
      for (const e of emojis) {
        if (!emojiMap[e]) emojiMap[e] = {};
        emojiMap[e][msg.author] = (emojiMap[e][msg.author] || 0) + 1;
      }
    }

    // Yanit suresi ve conversation starter
    if (lastAuthor && lastTime && msg.author !== lastAuthor) {
      const gap = msg.date.getTime() - lastTime.getTime();

      // Conversation starter (4 saat sessizlik)
      if (gap > 4 * 60 * 60 * 1000) {
        conversationStarters[msg.author] =
          (conversationStarters[msg.author] || 0) + 1;
      }

      // Yanit suresi (24 saatten kisa)
      if (gap < 24 * 60 * 60 * 1000) {
        replyTimes[msg.author].push(gap);
      }
    }

    lastAuthor = msg.author;
    lastTime = msg.date;
  }

  // Ortalamalari hesapla
  for (const person of persons) {
    const stats = personStats[person];
    if (stats.messageCount > 0) {
      stats.avgMessageLength = Math.round(stats.avgMessageLength / stats.messageCount);
    }

    const times = replyTimes[person];
    if (times.length > 0) {
      times.sort((a, b) => a - b);
      stats.shortestReplyMs = times[0];
      stats.longestReplyMs = times[times.length - 1];
      stats.avgReplyMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    }
  }

  // Top emojis
  const topEmojis = Object.entries(emojiMap)
    .map(([emoji, byPerson]) => {
      const entries = Object.entries(byPerson);
      const totalEmojis = entries.reduce((s, [, c]) => s + c, 0);
      const topPerson = entries.sort((a, b) => b[1] - a[1])[0];
      return {
        emoji,
        count: totalEmojis,
        by: topPerson ? topPerson[0] : "",
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { personStats, conversationStarters, hourlyDist, topEmojis, sorted };
}

function detectToxicitySignalsFromSorted(
  sorted: ParsedMessage[],
  persons: string[]
): ToxicitySignal[] {
  const signals: ToxicitySignal[] = [];

  // Late night
  let lateNightCount = 0;
  let lateNightExample: string | undefined;
  for (const m of sorted) {
    if (m.author && isLateNight(m.date)) {
      lateNightCount++;
      if (!lateNightExample) {
        lateNightExample = "\u201C" + m.message.slice(0, 60) + "...\u201D";
      }
    }
  }
  if (lateNightCount > 10) {
    signals.push({
      type: "late_night",
      severity: lateNightCount > 50 ? "high" : "medium",
      description: lateNightCount + " mesaj gece 00:00-06:00 aras\u0131nda at\u0131lm\u0131\u015F",
      example: lateNightExample,
    });
  }

  // Person bazli sinyaller
  const counts: Record<string, number> = {};
  for (const m of sorted) {
    if (m.author) counts[m.author] = (counts[m.author] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  for (const person of persons) {
    const personMsgs = sorted.filter((m) => m.author === person);

    // Cold war (kisa mesajlar)
    let shortCount = 0;
    let shortExample: string | undefined;
    for (const m of personMsgs) {
      if (
        m.message.length <= 3 &&
        !["tamam", "ok", "peki", "tm", "tmm"].includes(m.message.toLowerCase())
      ) {
        shortCount++;
        if (!shortExample) shortExample = "\u201C" + m.message + "\u201D";
      }
    }
    if (shortCount > 15) {
      signals.push({
        type: "cold_war",
        severity: "medium",
        description: person + ", " + shortCount + " kez cok kisa/soguk mesaj yazm\u0131\u015F",
        example: shortExample,
      });
    }

    // One sided
    const ratio = (counts[person] || 0) / total;
    if (ratio > 0.65 && persons.length === 2) {
      const pct = Math.round(ratio * 100);
      signals.push({
        type: "one_sided",
        severity: ratio > 0.75 ? "high" : "medium",
        description: person + " mesajlar\u0131n %" + pct + " yazm\u0131\u015F - tek tarafl\u0131 sohbet",
      });
    }

    // Tamam spam
    let tamamCount = 0;
    for (const m of personMsgs) {
      if (/^(tamam|ok|tm|tmm|peki)\.?$/i.test(m.message.trim())) {
        tamamCount++;
      }
    }
    if (tamamCount > 20) {
      signals.push({
        type: "tamam_spam",
        severity: "medium",
        description: person + " " + tamamCount + ' kez "tamam/ok" yazm\u0131\u015F - pasif-agresif pattern',
      });
    }

    // Interrogation
    let questionCount = 0;
    let questionExample: string | undefined;
    for (const m of personMsgs) {
      if ((m.message.match(/\?/g) || []).length >= 2) {
        questionCount++;
        if (!questionExample) {
          questionExample = "\u201C" + m.message.slice(0, 80) + "\u201D";
        }
      }
    }
    if (questionCount > 10) {
      signals.push({
        type: "interrogation",
        severity: "medium",
        description: person + ", " + questionCount + " kez \u00e7oklu soru sormu\u015F - sorgulama modu",
        example: questionExample,
      });
    }
  }

  // Double text
  if (persons.length === 2) {
    for (let i = 1; i < sorted.length; i++) {
      const gap =
        sorted[i].date.getTime() - sorted[i - 1].date.getTime();
      const hours = gap / (1000 * 60 * 60);
      if (hours > 24 && sorted[i].author === sorted[i - 1].author) {
        signals.push({
          type: "double_text",
          severity: "high",
          description: sorted[i].author + " " + Math.round(hours) + " saat sessizlikten sonra tekrar mesaj yazm\u0131\u015F",
          example: "\u201C" + sorted[i].message.slice(0, 60) + "\u201D",
        });
        break;
      }
    }
  }

  return signals;
}

function selectSampleMessagesFromSorted(
  sorted: ParsedMessage[]
): SampleMessage[] {
  const candidates: Array<ParsedMessage & { reason: string }> = [];

  // Gece mesajlari
  const lateNight = sorted.filter((m) => m.author && isLateNight(m.date));
  if (lateNight.length > 0) {
    candidates.push(
      ...lateNight.slice(0, 3).map((m) => ({ ...m, reason: "Gece mesaj\u0131" }))
    );
  }

  // Kisa mesajlar
  const shortOnes = sorted.filter((m) => m.author && m.message.length <= 3);
  if (shortOnes.length > 2) {
    candidates.push(
      ...shortOnes.slice(0, 3).map((m) => ({ ...m, reason: "K\u0131sa/s\u00f6\u011Fuk mesaj" }))
    );
  }

  // Soru agirlikli
  const questionHeavy = sorted.filter(
    (m) => m.author && (m.message.match(/\?/g) || []).length >= 2
  );
  if (questionHeavy.length > 0) {
    candidates.push(
      ...questionHeavy.slice(0, 2).map((m) => ({ ...m, reason: "Sorgulama mesaj\u0131" }))
    );
  }

  // Uzun mesajlar
  const sortedByLen = [...sorted]
    .filter((m) => m.author)
    .sort((a, b) => b.message.length - a.message.length);
  candidates.push(
    ...sortedByLen.slice(0, 2).map((m) => ({
      ...m,
      reason: "Uzun/yo\u011Fun mesaj",
    }))
  );

  // Tekrarlari temizle
  const seen = new Set<string>();
  const unique: SampleMessage[] = [];
  for (const c of candidates) {
    const key = c.message.slice(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        date: c.date,
        author: c.author!,
        message: c.message,
        reason: c.reason,
      });
    }
    if (unique.length >= 8) break;
  }

  return unique;
}

export function parseWhatsAppChat(rawText: string): ChatStats {
  const messages = whatsapp.parseString(rawText) as ParsedMessage[];
  if (messages.length === 0) {
    throw new Error("Sohbet dosyas\u0131 bo\u015F veya tan\u0131namad\u0131");
  }

  // System mesajlari filtrele
  const userMessages = messages.filter(
    (m) => m.author !== null && !isSystemMessage(m.message)
  );

  // Kisileri bul
  const personSet = new Set<string>();
  for (const m of userMessages) {
    if (m.author) personSet.add(m.author);
  }
  const persons = Array.from(personSet);

  if (persons.length < 2) {
    throw new Error("En az 2 ki\u015Fi bulunamad\u0131. Bu bir ili\u015Fki sohbeti mi?");
  }

  // Buyuk dosyalarda ornekleme
  const isLargeChat = userMessages.length > LARGE_CHAT_THRESHOLD;
  const processedMessages = isLargeChat
    ? sampleMessages(userMessages, SAMPLE_SIZE)
    : userMessages;

  // Tarih araligi (iteratif - spread operator buyuk dizilerde stack overflow yapar)
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const m of userMessages) {
    const t = m.date.getTime();
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }
  const start = new Date(minTime);
  const end = new Date(maxTime);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Tek pass ile istatistikleri hesapla
  const { personStats, conversationStarters, hourlyDist, topEmojis, sorted } =
    computeStatsInSinglePass(processedMessages, persons);

  // Toxicity sinyalleri
  const toxicitySignals = detectToxicitySignalsFromSorted(sorted, persons);

  // Ornek mesajlar
  const sampleMessagesList = selectSampleMessagesFromSorted(sorted);

  return {
    totalMessages: userMessages.length,
    dateRange: { start, end },
    totalDays,
    messagesPerDay: Math.round((userMessages.length / totalDays) * 10) / 10,
    persons: personStats,
    conversationStarters,
    topEmojis,
    hourlyDistribution: hourlyDist,
    toxicitySignals,
    sampleMessages: sampleMessagesList,
    isLargeChat, // Buyuk dosya bilgisi
  };
}
