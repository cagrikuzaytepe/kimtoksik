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

function isSystemMessage(msg: string): boolean {
  return SYSTEM_PATTERNS.some((p) => p.test(msg));
}

function countEmojis(text: string): number {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  return (text.match(emojiRegex) || []).length;
}

function isGreeting(msg: string): boolean {
  const greetings = [
    "merhaba", "selam", "hey", "nab\u0131r", "naber",
    "gunayd\u0131n", "iyi geceler", "iyi ak\u015Famlar",
    "good morning", "good night", "hello", "hi",
    "how are you", "n'aber", "selamlar",
  ];
  const lower = msg.toLowerCase().trim();
  return greetings.some((g) => lower.startsWith(g) || lower === g);
}

function isQuestion(msg: string): boolean {
  return (
    msg.includes("?") ||
    /\b(ne|nas\u0131l|neden|niye|nerede|kim|hangi|ka\u00e7)\b/i.test(msg)
  );
}

function isLateNight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 0 && hour < 6;
}

function selectSampleMessages(
  messages: ParsedMessage[],
  _persons: string[]
): SampleMessage[] {
  const userMessages = messages.filter(
    (m) => m.author && !isSystemMessage(m.message)
  );
  if (userMessages.length === 0) return [];

  const candidates: Array<ParsedMessage & { reason: string }> = [];

  const lateNight = userMessages.filter(
    (m) => isLateNight(m.date) && m.author
  );
  if (lateNight.length > 0) {
    candidates.push(
      ...lateNight.slice(0, 3).map((m) => ({
        ...m,
        reason: "Gece mesaj\u0131",
      }))
    );
  }

  const shortOnes = userMessages.filter(
    (m) => m.message.length <= 3 && m.author
  );
  if (shortOnes.length > 2) {
    candidates.push(
      ...shortOnes.slice(0, 3).map((m) => ({
        ...m,
        reason: "K\u0131sa/s\u00f6\u011Fuk mesaj",
      }))
    );
  }

  const questionHeavy = userMessages.filter(
    (m) => (m.message.match(/\?/g) || []).length >= 2 && m.author
  );
  if (questionHeavy.length > 0) {
    candidates.push(
      ...questionHeavy.slice(0, 2).map((m) => ({
        ...m,
        reason: "Sorgulama mesaj\u0131",
      }))
    );
  }

  const sorted = [...userMessages].sort(
    (a, b) => b.message.length - a.message.length
  );
  candidates.push(
    ...sorted.slice(0, 2).map((m) => ({
      ...m,
      reason: "Uzun/yo\u011Fun mesaj",
    }))
  );

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

function detectToxicitySignals(
  messages: ParsedMessage[],
  persons: string[]
): ToxicitySignal[] {
  const signals: ToxicitySignal[] = [];
  const userMessages = messages.filter(
    (m) => m.author && !isSystemMessage(m.message)
  );

  const lateNight = userMessages.filter((m) => isLateNight(m.date));
  if (lateNight.length > 10) {
    signals.push({
      type: "late_night",
      severity: lateNight.length > 50 ? "high" : "medium",
      description: lateNight.length + " mesaj gece 00:00-06:00 aras\u0131nda at\u0131lm\u0131\u015F",
      example: lateNight[0]
        ? "\u201C" + lateNight[0].message.slice(0, 60) + "...\u201D"
        : undefined,
    });
  }

  for (const person of persons) {
    const personMsgs = userMessages.filter((m) => m.author === person);
    const shortOnes = personMsgs.filter(
      (m) =>
        m.message.length <= 3 &&
        !["tamam", "ok", "peki", "tm", "tmm"].includes(
          m.message.toLowerCase()
        )
    );
    if (shortOnes.length > 15) {
      signals.push({
        type: "cold_war",
        severity: "medium",
        description: person + ", " + shortOnes.length + " kez \u00e7ok k\u0131sa/s\u00f6\u011Fuk mesaj yazm\u0131\u015F",
        example: "\u201C" + shortOnes[0].message + "\u201D",
      });
    }
  }

  const counts: Record<string, number> = {};
  for (const m of userMessages) {
    if (m.author) counts[m.author] = (counts[m.author] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  for (const [name, count] of Object.entries(counts)) {
    const ratio = count / total;
    if (ratio > 0.65 && persons.length === 2) {
      const pct = Math.round(ratio * 100);
      signals.push({
        type: "one_sided",
        severity: ratio > 0.75 ? "high" : "medium",
        description: name + " mesajlar\u0131n %" + pct + " yazm\u0131\u015F - tek tarafl\u0131 sohbet",
      });
    }
  }

  for (const person of persons) {
    const personMsgs = userMessages.filter((m) => m.author === person);
    const tamams = personMsgs.filter((m) =>
      /^(tamam|ok|tm|tmm|peki)\.?$/i.test(m.message.trim())
    );
    if (tamams.length > 20) {
      signals.push({
        type: "tamam_spam",
        severity: "medium",
        description: person + " " + tamams.length + ' kez "tamam/ok" yazm\u0131\u015F - pasif-agresif pattern',
      });
    }
  }

  for (const person of persons) {
    const personMsgs = userMessages.filter((m) => m.author === person);
    const questions = personMsgs.filter(
      (m) => (m.message.match(/\?/g) || []).length >= 2
    );
    if (questions.length > 10) {
      signals.push({
        type: "interrogation",
        severity: "medium",
        description: person + ", " + questions.length + " kez \u00e7oklu soru sormu\u015F - sorgulama modu",
        example: "\u201C" + questions[0].message.slice(0, 80) + "\u201D",
      });
    }
  }

  if (persons.length === 2) {
    const sorted = [...userMessages].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
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

export function parseWhatsAppChat(rawText: string): ChatStats {
  const messages = whatsapp.parseString(rawText) as ParsedMessage[];
  if (messages.length === 0) {
    throw new Error("Sohbet dosyas\u0131 bo\u015F veya tan\u0131namad\u0131");
  }

  const userMessages = messages.filter(
    (m) => m.author !== null && !isSystemMessage(m.message)
  );

  const personSet = new Set<string>();
  for (const m of userMessages) {
    if (m.author) personSet.add(m.author);
  }
  const persons = Array.from(personSet);

  if (persons.length < 2) {
    throw new Error("En az 2 ki\u015Fi bulunamad\u0131. Bu bir ili\u015Fki sohbeti mi?");
  }

  const dates = userMessages.map((m) => m.date.getTime());
  const start = new Date(Math.min(...dates));
  const end = new Date(Math.max(...dates));
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  const personStats: Record<string, PersonStats> = {};
  const conversationStarters: Record<string, number> = {};
  const hourlyDist = new Array(24).fill(0);

  for (const person of persons) {
    const pMsgs = userMessages.filter((m) => m.author === person);
    personStats[person] = {
      name: person,
      messageCount: pMsgs.length,
      avgMessageLength:
        pMsgs.length > 0
          ? pMsgs.reduce((s, m) => s + m.message.length, 0) / pMsgs.length
          : 0,
      emojiCount: pMsgs.reduce((s, m) => s + countEmojis(m.message), 0),
      mediaOmitted: pMsgs.filter((m) =>
        /media omitted|<media omitted>/i.test(m.message)
      ).length,
      questionCount: pMsgs.filter((m) => isQuestion(m.message)).length,
      greetingCount: pMsgs.filter((m) => isGreeting(m.message)).length,
      lateNightMessages: pMsgs.filter((m) => isLateNight(m.date)).length,
      shortestReplyMs: 0,
      longestReplyMs: 0,
      avgReplyMs: 0,
    };
    conversationStarters[person] = 0;
  }

  const sorted = [...userMessages].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let lastAuthor: string | null = null;
  let lastTime: Date | null = null;
  const replyTimes: Record<string, number[]> = {};
  for (const p of persons) replyTimes[p] = [];

  for (const msg of sorted) {
    if (!msg.author) continue;

    hourlyDist[msg.date.getHours()]++;

    if (lastAuthor && lastTime && msg.author !== lastAuthor) {
      const gap = msg.date.getTime() - lastTime.getTime();
      if (gap > 4 * 60 * 60 * 1000) {
        conversationStarters[msg.author] =
          (conversationStarters[msg.author] || 0) + 1;
      }
    }

    if (lastAuthor && lastTime && msg.author !== lastAuthor) {
      const replyTime = msg.date.getTime() - lastTime.getTime();
      if (replyTime < 24 * 60 * 60 * 1000) {
        replyTimes[msg.author].push(replyTime);
      }
    }

    lastAuthor = msg.author;
    lastTime = msg.date;
  }

  for (const person of persons) {
    const times = replyTimes[person];
    if (times.length > 0) {
      times.sort((a, b) => a - b);
      personStats[person].shortestReplyMs = times[0];
      personStats[person].longestReplyMs = times[times.length - 1];
      personStats[person].avgReplyMs =
        times.reduce((a, b) => a + b, 0) / times.length;
    }
  }

  const emojiMap: Record<string, Record<string, number>> = {};
  for (const m of userMessages) {
    if (!m.author) continue;
    const emojis = m.message.match(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu
    );
    if (emojis) {
      for (const e of emojis) {
        if (!emojiMap[e]) emojiMap[e] = {};
        emojiMap[e][m.author] = (emojiMap[e][m.author] || 0) + 1;
      }
    }
  }
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

  const toxicitySignals = detectToxicitySignals(messages, persons);
  const sampleMessages = selectSampleMessages(messages, persons);

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
    sampleMessages,
  };
}
