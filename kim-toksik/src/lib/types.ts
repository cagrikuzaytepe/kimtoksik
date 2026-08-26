export interface ParsedMessage {
  date: Date;
  author: string | null;
  message: string;
}

export interface PersonStats {
  name: string;
  messageCount: number;
  avgMessageLength: number;
  emojiCount: number;
  mediaOmitted: number;
  questionCount: number;
  greetingCount: number;
  lateNightMessages: number;
  shortestReplyMs: number;
  longestReplyMs: number;
  avgReplyMs: number;
}

export interface ChatStats {
  totalMessages: number;
  dateRange: { start: Date; end: Date };
  totalDays: number;
  messagesPerDay: number;
  persons: Record<string, PersonStats>;
  conversationStarters: Record<string, number>;
  topEmojis: Array<{ emoji: string; count: number; by: string }>;
  hourlyDistribution: number[];
  toxicitySignals: ToxicitySignal[];
  sampleMessages: SampleMessage[];
}

export interface ToxicitySignal {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  example?: string;
}

export interface SampleMessage {
  date: Date;
  author: string;
  message: string;
  reason: string;
}

export interface Report {
  id: string;
  createdAt: string;
  chatStats: ChatStats;
  aiReport: AIReport;
}

export interface AIReport {
  toxicityScore: number;
  toxicityLabel: string;
  toxicityDescription: string;
  whoChases: { name: string; percentage: number }[];
  whoChasesDescription: string;
  redFlags: RedFlag[];
  verdict: string;
  verdictDescription: string;
  funFact: string;
}

export interface RedFlag {
  icon: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}
