import { Router } from "express";
import { v4 as uuid } from "uuid";
import { getDb, getSettings } from "../db/sqlite.js";
import { generateBriefing } from "../services/claude.js";
import { sendBriefingEmail } from "../services/inkbox.js";
import { checkDuplicate, addToIndex } from "../services/rag.js";
import type {
  Article,
  BriefingResponse,
  GenerateBriefingRequest,
} from "../../shared/types.js";

const router = Router();

let isGenerating = false;

// POST /api/brief/generate
router.post("/generate", async (req, res) => {
  if (isGenerating) {
    res.status(429).json({ error: "A briefing is already being generated" });
    return;
  }

  try {
    isGenerating = true;
    const settings = getSettings();

    if (!settings.claudeApiKey) {
      res.status(400).json({ error: "Claude API key not configured" });
      return;
    }

    const body = req.body as GenerateBriefingRequest;
    const categories = body.categories || settings.categories;
    const language = body.language || settings.language;
    const timeRange = body.timeRange || settings.timeRange;
    const summaryLength = body.summaryLength || settings.summaryLength;
    const bodyLength = body.bodyLength || settings.bodyLength;

    const allArticles: Article[] = [];
    const allSummaries: string[] = [];

    for (const category of categories) {
      const result = await generateBriefing({
        apiKey: settings.claudeApiKey,
        model: settings.model,
        category,
        language,
        timeRange,
        summaryLength,
        bodyLength,
      });
      allSummaries.push(result.summary);
      allArticles.push(...result.articles);
    }

    // Save briefing to DB
    const db = getDb();
    const briefingId = uuid();
    const combinedSummary = allSummaries.join("\n\n");

    db.prepare(
      "INSERT INTO briefings (id, summary, settings_snapshot) VALUES (?, ?, ?)"
    ).run(briefingId, combinedSummary, JSON.stringify(settings));

    // Save articles to DB with RAG dedup
    const insertArticle = db.prepare(`
      INSERT INTO articles (id, title, summary, body, source, source_url, category, language, published_at, briefing_id, is_follow_up, related_article_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const dedupedArticles: Article[] = [];

    for (const article of allArticles) {
      const dedup = await checkDuplicate(article.title, article.summary);

      if (dedup.isDuplicate) {
        console.log(`Skipping duplicate: ${article.title} (similarity: ${dedup.similarity.toFixed(2)})`);
        continue;
      }

      article.briefingId = briefingId;
      article.isFollowUp = dedup.isFollowUp;
      article.relatedArticleIds = dedup.relatedArticleIds;

      insertArticle.run(
        article.id, article.title, article.summary, article.body,
        article.source, article.sourceUrl, article.category, article.language,
        article.publishedAt, briefingId,
        dedup.isFollowUp ? 1 : 0,
        JSON.stringify(dedup.relatedArticleIds)
      );

      await addToIndex(article);
      dedupedArticles.push(article);
    }

    const relatedIds = [...new Set(dedupedArticles.flatMap((a) => a.relatedArticleIds || []))];
    const relatedPast: Article[] = [];
    if (relatedIds.length > 0) {
      const placeholders = relatedIds.map(() => "?").join(",");
      const rows = db
        .prepare(`SELECT * FROM articles WHERE id IN (${placeholders}) AND briefing_id != ?`)
        .all(...relatedIds, briefingId) as Array<Record<string, unknown>>;

      for (const a of rows) {
        relatedPast.push({
          id: a.id as string, title: a.title as string,
          summary: a.summary as string, body: a.body as string,
          source: a.source as string, sourceUrl: a.source_url as string,
          category: a.category as string, language: a.language as string,
          publishedAt: a.published_at as string, fetchedAt: a.fetched_at as string,
          briefingId: a.briefing_id as string,
        });
      }
    }

    const response: BriefingResponse = {
      id: briefingId,
      summary: combinedSummary,
      articles: dedupedArticles,
      relatedPast,
      generatedAt: new Date().toISOString(),
    };

    // Send briefing via Inkbox email (non-blocking)
    if (settings.deliveryEmail && settings.inkboxApiKey) {
      sendBriefingEmail(response, settings).catch((err) =>
        console.error("Email delivery failed:", err)
      );
    }

    res.json(response);
  } catch (err) {
    console.error("Briefing generation failed:", err);
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    isGenerating = false;
  }
});

// GET /api/brief/latest
router.get("/latest", (_req, res) => {
  const db = getDb();

  const briefing = db
    .prepare("SELECT * FROM briefings ORDER BY generated_at DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;

  if (!briefing) {
    res.json(null);
    return;
  }

  const articles = db
    .prepare("SELECT * FROM articles WHERE briefing_id = ? ORDER BY fetched_at")
    .all(briefing.id as string) as Array<Record<string, unknown>>;

  const response: BriefingResponse = {
    id: briefing.id as string,
    summary: briefing.summary as string,
    articles: articles.map((a) => ({
      id: a.id as string,
      title: a.title as string,
      summary: a.summary as string,
      body: a.body as string,
      source: a.source as string,
      sourceUrl: a.source_url as string,
      category: a.category as string,
      language: a.language as string,
      publishedAt: a.published_at as string,
      fetchedAt: a.fetched_at as string,
      briefingId: a.briefing_id as string,
      isFollowUp: !!(a.is_follow_up as number),
      relatedArticleIds: JSON.parse(
        (a.related_article_ids as string) || "[]"
      ),
    })),
    relatedPast: [],
    generatedAt: briefing.generated_at as string,
  };

  res.json(response);
});

export default router;
