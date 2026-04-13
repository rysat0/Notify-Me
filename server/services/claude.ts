import Anthropic from "@anthropic-ai/sdk";
import type { Article } from "../../shared/types.js";
import { v4 as uuid } from "uuid";

interface SearchAndSummarizeOptions {
  apiKey: string;
  model: string;
  category: string;
  language: string;
  timeRange: number;
  summaryLength: string;
  bodyLength: string;
}

interface BriefingResult {
  summary: string;
  articles: Article[];
}

const SUMMARY_LENGTH_MAP: Record<string, string> = {
  short: "3 sentences max",
  medium: "1 short paragraph (5-7 sentences)",
  detailed: "2-3 paragraphs with key details",
};

const BODY_LENGTH_MAP: Record<string, string> = {
  brief: "Key bullet points only, under 100 words",
  standard: "A concise summary, around 200 words",
  deep: "A thorough analysis, around 400 words",
};

export async function generateBriefing(
  options: SearchAndSummarizeOptions
): Promise<BriefingResult> {
  const client = new Anthropic({ apiKey: options.apiKey });

  const now = new Date();
  const timeDesc =
    options.timeRange <= 12
      ? `the past ${options.timeRange} hours`
      : `the past ${Math.round(options.timeRange / 24)} day(s)`;

  const languageInstruction =
    options.language === "ja"
      ? "Respond entirely in Japanese."
      : options.language === "zh"
        ? "Respond entirely in Chinese."
        : "Respond entirely in English.";

  const response = await client.messages.create({
    model: options.model || "claude-sonnet-4-20250514",
    max_tokens: 4096,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
    ],
    messages: [
      {
        role: "user",
        content: `You are a news research assistant. Search the web for the latest ${options.category} news from ${timeDesc}.

${languageInstruction}

Find 3-5 of the most important and interesting news stories. For each story, provide:
1. A clear title
2. The source name and URL
3. A summary (${SUMMARY_LENGTH_MAP[options.summaryLength] || SUMMARY_LENGTH_MAP.medium})
4. A detailed body (${BODY_LENGTH_MAP[options.bodyLength] || BODY_LENGTH_MAP.standard})

After listing individual articles, provide an overall daily summary that captures the key themes and trends.

Respond in this exact JSON format:
{
  "dailySummary": "overall summary text",
  "articles": [
    {
      "title": "...",
      "source": "source name",
      "sourceUrl": "https://...",
      "summary": "...",
      "body": "..."
    }
  ]
}

Return ONLY valid JSON, no markdown fences.`,
      },
    ],
  });

  // Extract text content from response
  let textContent = "";
  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    }
  }

  // Parse JSON from Claude's response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse briefing response from Claude");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    dailySummary: string;
    articles: Array<{
      title: string;
      source: string;
      sourceUrl: string;
      summary: string;
      body: string;
    }>;
  };

  const articles: Article[] = parsed.articles.map((a) => ({
    id: uuid(),
    title: a.title,
    summary: a.summary,
    body: a.body,
    source: a.source,
    sourceUrl: a.sourceUrl,
    category: options.category,
    language: options.language,
    publishedAt: now.toISOString(),
    fetchedAt: now.toISOString(),
    briefingId: "",
  }));

  return {
    summary: parsed.dailySummary,
    articles,
  };
}
