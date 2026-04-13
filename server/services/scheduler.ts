import cron, { type ScheduledTask } from "node-cron";
import { getSettings, getDb } from "../db/sqlite.js";
import { generateBriefing } from "./claude.js";
import { sendBriefingEmail } from "./inkbox.js";
import { checkDuplicate, addToIndex } from "./rag.js";
import { processIncomingEmails } from "./mail-commands.js";
import { v4 as uuid } from "uuid";
import type { Article, BriefingResponse } from "../../shared/types.js";

let scheduledTask: ScheduledTask | null = null;

export function startScheduler(): void {
  const settings = getSettings();
  const cronExpr = settings.scheduleTime || "0 8 * * *";

  if (scheduledTask) scheduledTask.stop();

  scheduledTask = cron.schedule(
    cronExpr,
    async () => {
      console.log(`[Scheduler] Running at ${new Date().toISOString()}`);
      try {
        const settings = getSettings();
        if (!settings.claudeApiKey) {
          console.log("[Scheduler] No API key, skipping.");
          return;
        }

        const db = getDb();
        const briefingId = uuid();
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

        const summary = allSummaries.join("\n\n");
        db.prepare(
          "INSERT INTO briefings (id, summary, settings_snapshot) VALUES (?, ?, ?)"
        ).run(briefingId, summary, JSON.stringify(settings));

        const insertArticle = db.prepare(`
          INSERT INTO articles (id, title, summary, body, source, source_url, category, language, published_at, briefing_id, is_follow_up, related_article_ids)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const article of allArticles) {
          const dedup = await checkDuplicate(article.title, article.summary);
          if (dedup.isDuplicate) continue;
          article.briefingId = briefingId;
          insertArticle.run(
            article.id, article.title, article.summary, article.body,
            article.source, article.sourceUrl, article.category,
            article.language, article.publishedAt, briefingId,
            dedup.isFollowUp ? 1 : 0, JSON.stringify(dedup.relatedArticleIds)
          );
          await addToIndex(article);
        }

        const briefingResponse: BriefingResponse = {
          id: briefingId, summary, articles: allArticles,
          relatedPast: [], generatedAt: new Date().toISOString(),
        };
        if (settings.deliveryEmail && settings.inkboxApiKey) {
          await sendBriefingEmail(briefingResponse, settings);
        }

        await processIncomingEmails();

        console.log(`[Scheduler] Briefing generated + emailed: ${briefingId}`);
      } catch (err) {
        console.error("[Scheduler] Failed:", err);
      }
    },
    { timezone: "America/New_York" }
  );

  console.log(`Scheduler started: ${cronExpr} (America/New_York)`);
}
