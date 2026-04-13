import { Router } from "express";
import { v4 as uuid } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import { getDb, getSettings } from "../db/sqlite.js";
import { searchVault, isMcpConnected } from "../mcp/client.js";

const router = Router();

router.post("/", async (req, res) => {
  const { message, articleRefs } = req.body as {
    message: string;
    articleRefs: string[];
  };

  const settings = getSettings();
  if (!settings.claudeApiKey) {
    res.status(400).json({ error: "Claude API key not configured" });
    return;
  }

  const db = getDb();
  const client = new Anthropic({ apiKey: settings.claudeApiKey });

  let articleContext = "";
  if (articleRefs.length > 0) {
    const placeholders = articleRefs.map(() => "?").join(",");
    const articles = db
      .prepare(`SELECT title, summary, body FROM articles WHERE id IN (${placeholders})`)
      .all(...articleRefs) as Array<Record<string, string>>;

    articleContext = articles
      .map((a) => `## ${a.title}\n${a.summary}\n\n${a.body}`)
      .join("\n\n---\n\n");
  }

  let vaultContext = "";
  if (isMcpConnected()) {
    vaultContext = await searchVault(message);
  }

  const history = db
    .prepare("SELECT role, content FROM chat_messages ORDER BY created_at DESC LIMIT 10")
    .all()
    .reverse() as Array<{ role: string; content: string }>;

  const systemPrompt = `You are a helpful research assistant. The user wants to dive deeper into news articles.

${articleContext ? `## Referenced Articles\n\n${articleContext}` : ""}

${vaultContext ? `## Additional Context from Knowledge Base\n\n${vaultContext}` : ""}

Provide insightful analysis, background context, and connections between topics. Be concise but thorough.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  const response = await client.messages.create({
    model: settings.model || "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";

  const insertMsg = db.prepare(
    "INSERT INTO chat_messages (id, role, content, article_refs) VALUES (?, ?, ?, ?)"
  );
  insertMsg.run(uuid(), "user", message, JSON.stringify(articleRefs));
  insertMsg.run(uuid(), "assistant", reply, "[]");

  res.json({ reply });
});

export default router;
