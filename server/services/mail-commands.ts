import { getIdentity } from "./inkbox.js";
import { getSettings, updateSettings } from "../db/sqlite.js";
import { generateBriefing } from "./claude.js";
import { sendBriefingEmail } from "./inkbox.js";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/sqlite.js";
import type { Article, BriefingResponse } from "../../shared/types.js";

interface ParsedCommand {
  action: "generate" | "categories" | "language" | "help" | "unknown";
  args: string[];
}

function parseCommand(text: string): ParsedCommand {
  const cleaned = text.trim().toLowerCase().split("\n")[0];

  if (cleaned.includes("generate") || cleaned.includes("briefing") || cleaned.includes("news")) {
    return { action: "generate", args: [] };
  }
  if (cleaned.startsWith("categories") || cleaned.startsWith("topics")) {
    const args = cleaned.replace(/^(categories|topics)\s*/i, "").split(/[\s,]+/).filter(Boolean);
    return { action: "categories", args };
  }
  if (cleaned.startsWith("language") || cleaned.startsWith("lang")) {
    const args = cleaned.replace(/^(language|lang)\s*/i, "").split(/\s+/).filter(Boolean);
    return { action: "language", args };
  }
  if (cleaned.includes("help")) {
    return { action: "help", args: [] };
  }
  return { action: "unknown", args: [] };
}

export async function processIncomingEmails(): Promise<number> {
  const identity = getIdentity();
  if (!identity) return 0;

  let processed = 0;
  const unreadIds: string[] = [];

  for await (const msg of identity.iterUnreadEmails()) {
    if (msg.direction === "outbound") continue;
    unreadIds.push(msg.id);

    const detail = await identity.getMessage(msg.id);
    const body = detail.bodyText || "";
    const command = parseCommand(body);
    const settings = getSettings();

    let replyText = "";

    switch (command.action) {
      case "generate": {
        replyText = "Generating your briefing now... You'll receive it shortly.";
        // Trigger briefing generation asynchronously
        (async () => {
          const allArticles: Article[] = [];
          const allSummaries: string[] = [];
          for (const category of settings.categories) {
            const result = await generateBriefing({
              apiKey: settings.claudeApiKey,
              model: settings.model,
              category,
              language: settings.language,
              timeRange: settings.timeRange,
              summaryLength: settings.summaryLength,
              bodyLength: settings.bodyLength,
            });
            allSummaries.push(result.summary);
            allArticles.push(...result.articles);
          }
          const db = getDb();
          const briefingId = uuid();
          const summary = allSummaries.join("\n\n");
          db.prepare("INSERT INTO briefings (id, summary, settings_snapshot) VALUES (?, ?, ?)").run(
            briefingId, summary, JSON.stringify(settings)
          );
          const response: BriefingResponse = {
            id: briefingId, summary, articles: allArticles,
            relatedPast: [], generatedAt: new Date().toISOString(),
          };
          await sendBriefingEmail(response, settings);
        })().catch(console.error);
        break;
      }
      case "categories": {
        if (command.args.length > 0) {
          updateSettings({ categories: command.args });
          replyText = `Categories updated to: ${command.args.join(", ")}`;
        } else {
          replyText = `Current categories: ${settings.categories.join(", ")}\n\nReply with: categories tech ai finance`;
        }
        break;
      }
      case "language": {
        const lang = command.args[0];
        if (lang && ["en", "ja", "zh"].includes(lang)) {
          updateSettings({ language: lang as "en" | "ja" | "zh" });
          replyText = `Language updated to: ${lang}`;
        } else {
          replyText = `Current language: ${settings.language}\nSupported: en, ja, zh`;
        }
        break;
      }
      case "help": {
        replyText = [
          "Notify Me Agent — Commands:",
          "",
          "generate — Generate a new briefing",
          "categories tech ai finance — Set news categories",
          "language en — Set language (en/ja/zh)",
          "help — Show this help",
        ].join("\n");
        break;
      }
      default: {
        replyText = `I didn't understand that command. Reply "help" for available commands.`;
      }
    }

    // Send reply
    await identity.sendEmail({
      to: [msg.fromAddress],
      subject: `Re: ${msg.subject}`,
      bodyText: replyText,
      inReplyToMessageId: msg.id,
    });

    processed++;
  }

  if (unreadIds.length > 0) {
    await identity.markEmailsRead(unreadIds);
  }

  return processed;
}
