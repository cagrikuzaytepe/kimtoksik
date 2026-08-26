import type { ChatStats } from "./types";

export function buildAnalysisPrompt(stats: ChatStats): string {
  const n = Object.keys(stats.persons);
  const p1 = stats.persons[n[0]];
  const p2 = stats.persons[n[1]];

  const samples = stats.sampleMessages
    .map((m) => `${m.author}: ${m.message.slice(0, 80)}`)
    .join("\n");

  const signals = stats.toxicitySignals
    .map((s) => s.description)
    .join("; ");

  return `Cift WhatsApp analizi. Turkce, kisa, eglenceli rapor hazirla.

${n[0]}: ${p1.messageCount} mesaj (%${Math.round((p1.messageCount / stats.totalMessages) * 100)}), ${p1.lateNightMessages} gece, yanit ${p1.avgReplyMs > 0 ? Math.round(p1.avgReplyMs / 1000 / 60) + "dk" : "yok"}
${n[1]}: ${p2.messageCount} mesaj (%${Math.round((p2.messageCount / stats.totalMessages) * 100)}), ${p2.lateNightMessages} gece, yanit ${p2.avgReplyMs > 0 ? Math.round(p2.avgReplyMs / 1000 / 60) + "dk" : "yok"}
Toplam: ${stats.totalMessages} mesaj, ${stats.totalDays} gun
Tespit: ${signals || "yok"}
Ornek: ${samples || "yok"}

JSON dondur:
{"toxicityScore":0-100,"toxicityLabel":"kisa etiket","toxicityDescription":"1-2 cumle espri","whoChases":[{"name":"en cok yazan","percentage":50},{"name":"diger","percentage":50}],"whoChasesDescription":"1 cumle","redFlags":[{"icon":"1","title":"baslik","description":"1 cumle","severity":"medium"}],"verdict":"beraberlik veya kiz/erkek lehine","verdictDescription":"2-3 cumle","funFact":"1 komik istatistik"}

Kurallar: Turkce. Kisa yaz. Red flags 3-5 arasi. Sadece JSON dondur, baska sey yazma.`;
}
