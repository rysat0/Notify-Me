import { LocalIndex } from "vectra";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { embed } from "./embedding.js";
import type { Article } from "../../shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, "../../data/vectra-index");

let index: LocalIndex;

export async function initRag(): Promise<void> {
  index = new LocalIndex(INDEX_PATH);
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }
  console.log("Vectra RAG index ready.");
}

export interface DedupResult {
  isDuplicate: boolean;
  isFollowUp: boolean;
  relatedArticleIds: string[];
  similarity: number;
}

export async function checkDuplicate(
  title: string,
  summary: string
): Promise<DedupResult> {
  const text = `${title}. ${summary}`;
  const vector = await embed(text);

  const results = await index.queryItems(vector, text, 3);

  if (results.length === 0) {
    return { isDuplicate: false, isFollowUp: false, relatedArticleIds: [], similarity: 0 };
  }

  const topScore = results[0].score;
  const relatedIds = results
    .filter((r) => r.score > 0.6)
    .map((r) => r.item.metadata.articleId as string);

  if (topScore > 0.85) {
    return { isDuplicate: true, isFollowUp: false, relatedArticleIds: relatedIds, similarity: topScore };
  }

  if (topScore > 0.7) {
    return { isDuplicate: false, isFollowUp: true, relatedArticleIds: relatedIds, similarity: topScore };
  }

  return { isDuplicate: false, isFollowUp: false, relatedArticleIds: relatedIds.length > 0 ? relatedIds : [], similarity: topScore };
}

export async function addToIndex(article: Article): Promise<void> {
  const text = `${article.title}. ${article.summary}`;
  const vector = await embed(text);

  await index.upsertItem({
    id: article.id,
    vector,
    metadata: {
      articleId: article.id,
      title: article.title,
      category: article.category,
      fetchedAt: article.fetchedAt,
    },
  });
}
