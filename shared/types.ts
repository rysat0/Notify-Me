export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string;
  source: string;
  sourceUrl: string;
  category: string;
  language: string;
  publishedAt: string;
  fetchedAt: string;
  briefingId: string;
  isFollowUp?: boolean;
  relatedArticleIds?: string[];
}

export interface BriefingResponse {
  id: string;
  summary: string;
  articles: Article[];
  relatedPast: Article[];
  generatedAt: string;
}

export type ClaudeModel =
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514"
  | "claude-haiku-4-5-20251001";

export interface UserConfig {
  claudeApiKey: string;
  elevenlabsApiKey?: string;
  model: ClaudeModel;
  language: "en" | "ja" | "zh";
  summaryLength: "short" | "medium" | "detailed";
  bodyLength: "brief" | "standard" | "deep";
  categories: string[];
  timeRange: number;
  sources: string[];
  scheduleTime: string;
  inkboxApiKey: string;
  inkboxIdentityHandle: string;
  deliveryEmail: string;
}

export interface InkboxStatus {
  connected: boolean;
  identityHandle: string | null;
  emailAddress: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  articleRefs: string[];
  createdAt: string;
}

export interface GenerateBriefingRequest {
  categories?: string[];
  language?: string;
  timeRange?: number;
  summaryLength?: string;
  bodyLength?: string;
}
