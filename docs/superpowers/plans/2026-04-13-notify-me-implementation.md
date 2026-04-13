# Notify Me Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personalized AI news briefing web app in a 2-hour hackathon using Claude API BYOK with web search, local RAG deduplication, and optional TTS.

**Architecture:** Vite proxy + Express integrated monorepo. Vite dev server (:5173) proxies `/api/*` to Express (:3001). Claude API with `web_search_20250305` tool fetches and summarizes news. Vectra + @huggingface/transformers provides local RAG for deduplication. Obsidian vault MCP server connects existing knowledge base.

**Tech Stack:** React 19 + TypeScript + Tailwind v4 + shadcn/ui, Express, @anthropic-ai/sdk, better-sqlite3, Vectra, @huggingface/transformers, @modelcontextprotocol/sdk, pnpm

---

## File Map

### Phase 1: MVP

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `package.json` | Root: concurrently runs client + server |
| Create | `pnpm-workspace.yaml` | pnpm workspace config (client, server, shared) |
| Create | `tsconfig.json` | Root: shared TS config |
| Create | `shared/package.json` | Shared workspace package (@notify-me/shared) |
| Create | `shared/types.ts` | Shared types: Article, BriefingResponse, UserConfig, ChatMessage |
| Create | `client/package.json` | Frontend deps + @notify-me/shared workspace ref |
| Create | `client/index.html` | Vite entry HTML |
| Create | `client/vite.config.ts` | Vite + Tailwind + proxy /api → :3001 |
| Create | `client/components.json` | shadcn/ui config (Tailwind v4 mode) |
| Create | `client/src/main.tsx` | React entry |
| Create | `client/src/App.tsx` | Router + layout |
| Create | `client/src/app.css` | Tailwind base imports |
| Create | `client/src/lib/utils.ts` | shadcn/ui cn() utility |
| Create | `client/src/lib/api.ts` | Fetch wrapper for /api/* |
| Create | `client/src/components/Dashboard.tsx` | Briefing display (shadcn Card/Button) |
| Create | `client/src/components/Settings.tsx` | BYOK + config form (shadcn Input/Select) |
| Create | `client/src/components/ArticleCard.tsx` | Single article card (shadcn Card/Badge) |
| Create | `server/package.json` | Backend deps + @notify-me/shared workspace ref |
| Create | `server/tsconfig.json` | Server TS config |
| Create | `server/index.ts` | Express entry point |
| Create | `server/db/schema.sql` | SQLite table definitions |
| Create | `server/db/sqlite.ts` | DB connection + init |
| Create | `server/routes/settings.ts` | GET/PUT /api/settings |
| Create | `server/routes/briefing.ts` | POST /api/brief/generate, GET /api/brief/latest |
| Create | `server/services/claude.ts` | Claude API client with web_search (model selectable) |

### Phase 2: RAG + MCP

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server/services/embedding.ts` | @huggingface/transformers embedding |
| Create | `server/services/rag.ts` | Vectra index: insert, query, dedup |
| Modify | `server/services/claude.ts` | Add RAG context to prompts |
| Modify | `server/routes/briefing.ts` | Add dedup + related articles |
| Create | `server/mcp/client.ts` | Obsidian vault MCP client |
| Modify | `client/src/components/ArticleCard.tsx` | Show "follow-up" badge + related links |

### Phase 3: Extensions

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server/routes/chat.ts` | POST /api/chat |
| Create | `client/src/components/Chat.tsx` | Chat UI with article citation |
| Create | `server/services/scheduler.ts` | node-cron daily 8AM EST |
| Create | `server/routes/tts.ts` | POST /api/tts/generate, GET /api/tts/:id |
| Create | `server/services/tts.ts` | ElevenLabs client |
| Create | `client/src/components/AudioPlayer.tsx` | Audio playback UI |

---

## Phase 1: MVP (Target 60 min)

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `shared/package.json`
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/vite.config.ts`
- Create: `client/components.json`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/app.css`
- Create: `client/src/lib/utils.ts`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/index.ts`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "notify-me",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently -n client,server -c blue,green \"pnpm --filter client dev\" \"pnpm --filter server dev\"",
    "build": "pnpm --filter client build"
  },
  "devDependencies": {
    "concurrently": "^9.2.1",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "client"
  - "server"
  - "shared"
```

- [ ] **Step 3: Create shared/package.json**

```json
{
  "name": "@notify-me/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./types.ts"
}
```

- [ ] **Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Scaffold Vite React client**

```bash
cd /Users/k22062kk/Downloads/Notify-Me
pnpm create vite client --template react-ts
```

- [ ] **Step 6: Replace client/vite.config.ts with proxy**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 7: Install client dependencies + shadcn/ui**

```bash
cd /Users/k22062kk/Downloads/Notify-Me/client
pnpm add tailwindcss @tailwindcss/vite lucide-react react-router-dom @notify-me/shared
pnpm add clsx tailwind-merge class-variance-authority
```

- [ ] **Step 8: Initialize shadcn/ui and add components**

```bash
cd /Users/k22062kk/Downloads/Notify-Me/client
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add card button input tabs dialog select badge
```

Note: The `-d` flag uses defaults. After init, verify `components.json` has `"tailwind": { "config": "" }` (empty string = Tailwind v4 mode, no separate config needed).

- [ ] **Step 9: Create client/src/lib/utils.ts (shadcn/ui helper)**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 10: Create client/src/app.css**

```css
@import "tailwindcss";
```

- [ ] **Step 11: Create client/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 12: Create client/src/App.tsx (placeholder)**

```tsx
import { Routes, Route, Link } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <nav className="mx-auto flex max-w-4xl items-center gap-6">
          <h1 className="text-xl font-bold">Notify Me</h1>
          <Link to="/" className="text-zinc-400 hover:text-zinc-100">
            Dashboard
          </Link>
          <Link to="/settings" className="text-zinc-400 hover:text-zinc-100">
            Settings
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<p>Dashboard placeholder</p>} />
          <Route path="/settings" element={<p>Settings placeholder</p>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 13: Create server/package.json**

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=../.env index.ts",
    "start": "tsx --env-file=../.env index.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.88.0",
    "@notify-me/shared": "workspace:*",
    "better-sqlite3": "^12.9.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 14: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "paths": {
      "@notify-me/shared": ["../shared/types.ts"]
    }
  },
  "include": [".", "../shared"]
}
```

- [ ] **Step 15: Create server/index.ts**

```typescript
import express from "express";
import cors from "cors";
import { initDb } from "./db/sqlite.js";
import settingsRouter from "./routes/settings.js";
import briefingRouter from "./routes/briefing.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize database
initDb();

// Routes
app.use("/api/settings", settingsRouter);
app.use("/api/brief", briefingRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 16: Install all dependencies via pnpm workspaces**

```bash
cd /Users/k22062kk/Downloads/Notify-Me
pnpm install
```

Note: With pnpm workspaces, a single `pnpm install` at root installs all workspace deps. No need to `cd` into each directory.

- [ ] **Step 17: Verify both servers start**

```bash
cd /Users/k22062kk/Downloads/Notify-Me
pnpm dev
```

Expected: Vite on :5173, Express on :3001. Open http://localhost:5173 to see placeholder.

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "feat: project scaffold — pnpm workspaces + Vite + Express + Tailwind + shadcn/ui"
```

---

### Task 2: Shared Types + SQLite Database

**Files:**
- Create: `shared/types.ts`
- Create: `server/db/schema.sql`
- Create: `server/db/sqlite.ts`

- [ ] **Step 1: Create shared/types.ts**

```typescript
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
```

- [ ] **Step 2: Create server/db/schema.sql**

```sql
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  claude_api_key TEXT NOT NULL DEFAULT '',
  elevenlabs_api_key TEXT DEFAULT '',
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  language TEXT DEFAULT 'en',
  summary_length TEXT DEFAULT 'medium',
  body_length TEXT DEFAULT 'standard',
  categories TEXT DEFAULT '["tech","ai"]',
  time_range INTEGER DEFAULT 24,
  sources TEXT DEFAULT '[]',
  schedule_time TEXT DEFAULT '0 8 * * *'
);

CREATE TABLE IF NOT EXISTS briefings (
  id TEXT PRIMARY KEY,
  summary TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  settings_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  source TEXT,
  source_url TEXT,
  category TEXT,
  language TEXT,
  published_at TEXT,
  fetched_at TEXT DEFAULT (datetime('now')),
  briefing_id TEXT REFERENCES briefings(id),
  is_follow_up INTEGER DEFAULT 0,
  related_article_ids TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  article_refs TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (id, claude_api_key) VALUES (1, '');
```

- [ ] **Step 3: Create server/db/sqlite.ts**

```typescript
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { UserConfig } from "../../shared/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(join(__dirname, "../../data/notify-me.db"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initDb(): void {
  const database = getDb();
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  database.exec(schema);
  console.log("Database initialized");
}

export function getSettings(): UserConfig {
  const row = getDb()
    .prepare("SELECT * FROM settings WHERE id = 1")
    .get() as Record<string, unknown>;

  return {
    claudeApiKey: row.claude_api_key as string,
    elevenlabsApiKey: (row.elevenlabs_api_key as string) || undefined,
    model: (row.model as UserConfig["model"]) || "claude-sonnet-4-20250514",
    language: row.language as UserConfig["language"],
    summaryLength: row.summary_length as UserConfig["summaryLength"],
    bodyLength: row.body_length as UserConfig["bodyLength"],
    categories: JSON.parse(row.categories as string),
    timeRange: row.time_range as number,
    sources: JSON.parse(row.sources as string),
    scheduleTime: row.schedule_time as string,
  };
}

export function updateSettings(config: Partial<UserConfig>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (config.claudeApiKey !== undefined) {
    fields.push("claude_api_key = ?");
    values.push(config.claudeApiKey);
  }
  if (config.elevenlabsApiKey !== undefined) {
    fields.push("elevenlabs_api_key = ?");
    values.push(config.elevenlabsApiKey);
  }
  if (config.model !== undefined) {
    fields.push("model = ?");
    values.push(config.model);
  }
  if (config.language !== undefined) {
    fields.push("language = ?");
    values.push(config.language);
  }
  if (config.summaryLength !== undefined) {
    fields.push("summary_length = ?");
    values.push(config.summaryLength);
  }
  if (config.bodyLength !== undefined) {
    fields.push("body_length = ?");
    values.push(config.bodyLength);
  }
  if (config.categories !== undefined) {
    fields.push("categories = ?");
    values.push(JSON.stringify(config.categories));
  }
  if (config.timeRange !== undefined) {
    fields.push("time_range = ?");
    values.push(config.timeRange);
  }
  if (config.sources !== undefined) {
    fields.push("sources = ?");
    values.push(JSON.stringify(config.sources));
  }
  if (config.scheduleTime !== undefined) {
    fields.push("schedule_time = ?");
    values.push(config.scheduleTime);
  }

  if (fields.length > 0) {
    values.push(1);
    db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values
    );
  }
}
```

- [ ] **Step 4: Create data/ directory and add to .gitignore**

```bash
mkdir -p /Users/k22062kk/Downloads/Notify-Me/data
echo "data/" >> /Users/k22062kk/Downloads/Notify-Me/.gitignore
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shared types + SQLite database layer"
```

---

### Task 3: Settings API Route

**Files:**
- Create: `server/routes/settings.ts`

- [ ] **Step 1: Create server/routes/settings.ts**

```typescript
import { Router } from "express";
import { getSettings, updateSettings } from "../db/sqlite.js";

const router = Router();

// GET /api/settings
router.get("/", (_req, res) => {
  const settings = getSettings();
  res.json({
    ...settings,
    claudeApiKey: settings.claudeApiKey ? "sk-...configured" : "",
    elevenlabsApiKey: settings.elevenlabsApiKey ? "sk-...configured" : "",
  });
});

// PUT /api/settings
router.put("/", (req, res) => {
  const updates = req.body;
  updateSettings(updates);
  const settings = getSettings();
  res.json({
    ...settings,
    claudeApiKey: settings.claudeApiKey ? "sk-...configured" : "",
    elevenlabsApiKey: settings.elevenlabsApiKey ? "sk-...configured" : "",
  });
});

export default router;
```

- [ ] **Step 2: Verify server starts and settings endpoint works**

```bash
cd /Users/k22062kk/Downloads/Notify-Me/server
pnpm dev &
sleep 2
curl -s http://localhost:3001/api/settings | head -c 200
kill %1
```

Expected: JSON response with default settings.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: settings API route (GET/PUT /api/settings)"
```

---

### Task 4: Claude API Service with Web Search

**Files:**
- Create: `server/services/claude.ts`

- [ ] **Step 1: Create server/services/claude.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: Claude API service with web_search tool"
```

---

### Task 5: Briefing API Route

**Files:**
- Create: `server/routes/briefing.ts`

- [ ] **Step 1: Create server/routes/briefing.ts**

```typescript
import { Router } from "express";
import { v4 as uuid } from "uuid";
import { getDb, getSettings } from "../db/sqlite.js";
import { generateBriefing } from "../services/claude.js";
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

    // Save articles to DB
    const insertArticle = db.prepare(`
      INSERT INTO articles (id, title, summary, body, source, source_url, category, language, published_at, briefing_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const article of allArticles) {
      article.briefingId = briefingId;
      insertArticle.run(
        article.id,
        article.title,
        article.summary,
        article.body,
        article.source,
        article.sourceUrl,
        article.category,
        article.language,
        article.publishedAt,
        briefingId
      );
    }

    const response: BriefingResponse = {
      id: briefingId,
      summary: combinedSummary,
      articles: allArticles,
      relatedPast: [],
      generatedAt: new Date().toISOString(),
    };

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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: briefing API route (generate + latest)"
```

---

### Task 6: Frontend — Dashboard + Settings + ArticleCard

**Files:**
- Create: `client/src/lib/api.ts`
- Create: `client/src/components/Dashboard.tsx`
- Create: `client/src/components/Settings.tsx`
- Create: `client/src/components/ArticleCard.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create client/src/lib/api.ts**

```typescript
import type {
  UserConfig,
  BriefingResponse,
  GenerateBriefingRequest,
} from "@shared/types";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getSettings: () => fetchJson<UserConfig>("/api/settings"),

  updateSettings: (settings: Partial<UserConfig>) =>
    fetchJson<UserConfig>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  generateBriefing: (req?: GenerateBriefingRequest) =>
    fetchJson<BriefingResponse>("/api/brief/generate", {
      method: "POST",
      body: JSON.stringify(req || {}),
    }),

  getLatestBriefing: () =>
    fetchJson<BriefingResponse | null>("/api/brief/latest"),
};
```

- [ ] **Step 2: Create client/src/components/ArticleCard.tsx**

```tsx
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Article } from "@shared/types";

export function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-100">{article.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {article.source} &middot; {article.category}
            {article.isFollowUp && (
              <span className="ml-2 rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">
                Follow-up
              </span>
            )}
          </p>
        </div>
        {article.sourceUrl && (
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      <p className="text-sm text-zinc-300">{article.summary}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Collapse" : "Read more"}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-zinc-800 pt-3 text-sm leading-relaxed text-zinc-300">
          {article.body}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create client/src/components/Dashboard.tsx**

```tsx
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { ArticleCard } from "./ArticleCard";
import type { BriefingResponse } from "@shared/types";

export function Dashboard() {
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    api
      .getLatestBriefing()
      .then((data) => setBriefing(data))
      .catch((e) => setError(e.message))
      .finally(() => setInitialLoad(false));
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const data = await api.generateBriefing();
      setBriefing(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoad) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Today's Briefing</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {loading ? "Generating..." : "Generate Briefing"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {briefing && (
        <>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Daily Summary
            </h3>
            <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">
              {briefing.summary}
            </p>
            <p className="mt-3 text-xs text-zinc-600">
              Generated: {new Date(briefing.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="space-y-3">
            {briefing.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </>
      )}

      {!briefing && !loading && (
        <div className="py-20 text-center text-zinc-500">
          <p className="text-lg">No briefing yet</p>
          <p className="mt-1 text-sm">
            Configure your API key in Settings, then generate your first
            briefing.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create client/src/components/Settings.tsx**

```tsx
import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import type { UserConfig } from "@shared/types";

const CATEGORIES = [
  "tech",
  "ai",
  "finance",
  "politics",
  "science",
  "business",
  "startups",
  "security",
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

export function Settings() {
  const [config, setConfig] = useState<Partial<UserConfig>>({});
  const [claudeKey, setClaudeKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setConfig(s));
  }, []);

  async function handleSave() {
    setSaving(true);
    const updates: Partial<UserConfig> = { ...config };
    if (claudeKey) updates.claudeApiKey = claudeKey;
    if (elevenlabsKey) updates.elevenlabsApiKey = elevenlabsKey;

    await api.updateSettings(updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleCategory(cat: string) {
    const current = config.categories || [];
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    setConfig({ ...config, categories: next });
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-300">API Keys (BYOK)</h3>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Claude API Key *
          </label>
          <input
            type="password"
            placeholder={config.claudeApiKey || "sk-ant-..."}
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            ElevenLabs API Key (optional — enables podcast audio)
          </label>
          <input
            type="password"
            placeholder={config.elevenlabsApiKey || "sk-..."}
            value={elevenlabsKey}
            onChange={(e) => setElevenlabsKey(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">Language</h3>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() =>
                setConfig({
                  ...config,
                  language: lang.value as UserConfig["language"],
                })
              }
              className={`rounded-lg px-4 py-2 text-sm ${
                config.language === lang.value
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">News Categories</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm capitalize ${
                config.categories?.includes(cat)
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">
          Time Range: {config.timeRange || 24}h
        </h3>
        <input
          type="range"
          min={6}
          max={48}
          step={6}
          value={config.timeRange || 24}
          onChange={(e) =>
            setConfig({ ...config, timeRange: Number(e.target.value) })
          }
          className="w-full"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>6h</span>
          <span>12h</span>
          <span>24h</span>
          <span>48h</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300">Summary Length</h3>
          {(["short", "medium", "detailed"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="summaryLength"
                checked={config.summaryLength === opt}
                onChange={() => setConfig({ ...config, summaryLength: opt })}
                className="accent-blue-600"
              />
              <span className="capitalize text-zinc-400">{opt}</span>
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300">Article Length</h3>
          {(["brief", "standard", "deep"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bodyLength"
                checked={config.bodyLength === opt}
                onChange={() => setConfig({ ...config, bodyLength: opt })}
                className="accent-blue-600"
              />
              <span className="capitalize text-zinc-400">{opt}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">Claude Model</h3>
        <p className="text-xs text-zinc-500">
          Choose the model for news search and summarization.
        </p>
        {(
          [
            {
              value: "claude-sonnet-4-20250514",
              label: "Sonnet 4",
              desc: "Balanced speed/quality (recommended)",
            },
            {
              value: "claude-opus-4-20250514",
              label: "Opus 4",
              desc: "Highest quality, slower",
            },
            {
              value: "claude-haiku-4-5-20251001",
              label: "Haiku 4.5",
              desc: "Fastest, most affordable",
            },
          ] as const
        ).map((m) => (
          <label
            key={m.value}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:border-zinc-600"
          >
            <input
              type="radio"
              name="model"
              checked={config.model === m.value}
              onChange={() => setConfig({ ...config, model: m.value })}
              className="accent-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-zinc-200">
                {m.label}
              </span>
              <span className="ml-2 text-xs text-zinc-500">{m.desc}</span>
            </div>
          </label>
        ))}
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Update client/src/App.tsx with real components**

```tsx
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { Settings } from "./components/Settings";

function App() {
  const location = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm ${
        location.pathname === to
          ? "font-medium text-zinc-100"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <nav className="mx-auto flex max-w-4xl items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-blue-500">Notify</span> Me
          </h1>
          {navLink("/", "Dashboard")}
          {navLink("/settings", "Settings")}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 6: Test full stack**

```bash
cd /Users/k22062kk/Downloads/Notify-Me
pnpm dev
```

Open http://localhost:5173 — verify:
1. Dashboard loads with "No briefing yet" message
2. Settings page loads with form
3. Enter Claude API key, save, return to Dashboard, click Generate

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Phase 1 MVP — Dashboard + Settings + Briefing generation"
```

---

## Phase 2: RAG + MCP (Target 30 min)

### Task 7: Embedding Service

**Files:**
- Create: `server/services/embedding.ts`

- [ ] **Step 1: Install @huggingface/transformers**

```bash
cd /Users/k22062kk/Downloads/Notify-Me/server
pnpm add @huggingface/transformers
```

- [ ] **Step 2: Create server/services/embedding.ts**

```typescript
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

let extractor: FeatureExtractionPipeline | null = null;

export async function initEmbedding(): Promise<void> {
  if (!extractor) {
    console.log("Loading embedding model (first time may download ~30MB)...");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
    console.log("Embedding model loaded.");
  }
}

export async function embed(text: string): Promise<number[]> {
  if (!extractor) await initEmbedding();
  const result = await extractor!(text, { pooling: "mean", normalize: true });
  return Array.from(result.data as Float32Array);
}
```

- [ ] **Step 3: Verify embedding produces 384-dim vectors**

```bash
echo 'import { initEmbedding, embed } from "./services/embedding.js"; await initEmbedding(); const v = await embed("test news article"); console.log("dims:", v.length, "sample:", v.slice(0,3));' > /tmp/test-embed.ts
cd /Users/k22062kk/Downloads/Notify-Me/server && pnpm tsx /tmp/test-embed.ts
```

Expected: `dims: 384 sample: [0.xxx, 0.xxx, 0.xxx]`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: embedding service (@huggingface/transformers, MiniLM)"
```

---

### Task 8: RAG Service (Vectra)

**Files:**
- Create: `server/services/rag.ts`
- Modify: `server/routes/briefing.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Install vectra**

```bash
cd /Users/k22062kk/Downloads/Notify-Me/server
pnpm add vectra
```

- [ ] **Step 2: Create server/services/rag.ts**

```typescript
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

  const results = await index.queryItems(vector, 3);

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

  await index.upsertItems([
    {
      id: article.id,
      vector,
      metadata: {
        articleId: article.id,
        title: article.title,
        category: article.category,
        fetchedAt: article.fetchedAt,
      },
    },
  ]);
}
```

- [ ] **Step 3: Update server/index.ts to init RAG on startup**

Add after existing imports:

```typescript
import { initEmbedding } from "./services/embedding.js";
import { initRag } from "./services/rag.js";
```

Add after `initDb();`:

```typescript
initEmbedding().then(() => initRag()).then(() => {
  console.log("RAG system ready.");
});
```

- [ ] **Step 4: Update server/routes/briefing.ts — add RAG dedup to POST /generate**

Add imports at top:

```typescript
import { checkDuplicate, addToIndex } from "../services/rag.js";
```

Replace the article saving loop (the `for (const article of allArticles)` block and the response construction) with:

```typescript
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
```

- [ ] **Step 5: Test RAG dedup — generate twice and verify second run skips duplicates**

```bash
cd /Users/k22062kk/Downloads/Notify-Me
pnpm dev
```

Generate a briefing, then generate again. Console should show "Skipping duplicate" for repeated stories.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Phase 2 RAG — Vectra dedup + related article linking"
```

---

### Task 9: Obsidian Vault MCP Client

**Files:**
- Create: `server/mcp/client.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Install MCP SDK**

```bash
cd /Users/k22062kk/Downloads/Notify-Me/server
pnpm add @modelcontextprotocol/sdk
```

- [ ] **Step 2: Create server/mcp/client.ts**

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let mcpClient: Client | null = null;

const VAULT_SERVER_PATH =
  process.env.OBSIDIAN_MCP_SERVER_PATH ||
  "/Users/k22062kk/Library/Mobile Documents/iCloud~md~obsidian/Documents/My Value/vault-mcp-server.py";

export async function initMcpClient(): Promise<void> {
  try {
    const transport = new StdioClientTransport({
      command: "python3",
      args: [VAULT_SERVER_PATH],
    });

    mcpClient = new Client({
      name: "notify-me",
      version: "1.0.0",
    });

    await mcpClient.connect(transport);
    console.log("Obsidian vault MCP connected.");
  } catch (err) {
    console.warn("MCP connection failed (non-fatal):", err);
    mcpClient = null;
  }
}

export async function searchVault(
  query: string,
  scope: string = "all"
): Promise<string> {
  if (!mcpClient) return "";
  try {
    const result = await mcpClient.callTool({
      name: "search_vault",
      arguments: { query, scope },
    });
    return (result.content as Array<{ text: string }>)[0]?.text || "";
  } catch {
    return "";
  }
}

export async function readWiki(topic: string): Promise<string> {
  if (!mcpClient) return "";
  try {
    const result = await mcpClient.callTool({
      name: "read_wiki",
      arguments: { topic },
    });
    return (result.content as Array<{ text: string }>)[0]?.text || "";
  } catch {
    return "";
  }
}

export function isMcpConnected(): boolean {
  return mcpClient !== null;
}
```

- [ ] **Step 3: Add MCP init to server/index.ts**

Add import:

```typescript
import { initMcpClient } from "./mcp/client.js";
```

Add after RAG init:

```typescript
initMcpClient().catch(() => {
  console.log("Obsidian MCP not available — continuing without vault.");
});
```

- [ ] **Step 4: Test MCP connection**

```bash
cd /Users/k22062kk/Downloads/Notify-Me
pnpm dev
```

Expected console: `Obsidian vault MCP connected.`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Obsidian vault MCP client integration"
```

---

## Phase 3: Extensions (Remaining Time)

### Task 10: Chat Deep-Dive

**Files:**
- Create: `server/routes/chat.ts`
- Create: `client/src/components/Chat.tsx`
- Modify: `server/index.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create server/routes/chat.ts**

```typescript
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
```

- [ ] **Step 2: Add chat route to server/index.ts**

```typescript
import chatRouter from "./routes/chat.js";

app.use("/api/chat", chatRouter);
```

- [ ] **Step 3: Create client/src/components/Chat.tsx**

```tsx
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, X } from "lucide-react";
import type { Article } from "@shared/types";

interface ChatProps {
  articles: Article[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat({ articles }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function toggleRef(id: string) {
    setSelectedRefs((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, articleRefs: selectedRefs }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Failed to get response" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {articles.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs text-zinc-500">Tap articles to reference in chat:</p>
          <div className="flex flex-wrap gap-1">
            {articles.map((a) => (
              <button
                key={a.id}
                onClick={() => toggleRef(a.id)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  selectedRefs.includes(a.id)
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {a.title.slice(0, 40)}...
                {selectedRefs.includes(a.id) && <X size={10} className="ml-1 inline" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-600">
            Ask anything about today's articles...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-12 bg-blue-900/50 text-blue-100"
                : "mr-12 bg-zinc-800 text-zinc-200"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="mr-12 flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-400">
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about the articles..."
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update App.tsx — add Chat route with shared briefing state**

Replace entire `client/src/App.tsx`:

```tsx
import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { Settings } from "./components/Settings";
import { Chat } from "./components/Chat";
import type { Article } from "@shared/types";

function App() {
  const location = useLocation();
  const [latestArticles, setLatestArticles] = useState<Article[]>([]);

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`text-sm ${
        location.pathname === to
          ? "font-medium text-zinc-100"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <nav className="mx-auto flex max-w-4xl items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-blue-500">Notify</span> Me
          </h1>
          {navLink("/", "Dashboard")}
          {navLink("/chat", "Chat")}
          {navLink("/settings", "Settings")}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route
            path="/"
            element={<Dashboard onArticlesLoaded={setLatestArticles} />}
          />
          <Route path="/chat" element={<Chat articles={latestArticles} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```

Note: This requires adding an `onArticlesLoaded` prop to `Dashboard`. Add to Dashboard.tsx:

```tsx
// Update Dashboard props:
interface DashboardProps {
  onArticlesLoaded?: (articles: Article[]) => void;
}

export function Dashboard({ onArticlesLoaded }: DashboardProps) {
  // ... existing code ...

  // Call onArticlesLoaded when briefing is loaded/generated:
  // After setBriefing(data) in useEffect:
  //   if (data) onArticlesLoaded?.(data.articles);
  // After setBriefing(data) in handleGenerate:
  //   onArticlesLoaded?.(data.articles);
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Phase 3 — Chat deep-dive with article citations + Obsidian context"
```

---

### Task 11: Scheduler (node-cron)

**Files:**
- Create: `server/services/scheduler.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Install node-cron**

```bash
cd /Users/k22062kk/Downloads/Notify-Me/server
pnpm add node-cron
pnpm add -D @types/node-cron
```

- [ ] **Step 2: Create server/services/scheduler.ts**

```typescript
import cron from "node-cron";
import { getSettings, getDb } from "../db/sqlite.js";
import { generateBriefing } from "./claude.js";
import { checkDuplicate, addToIndex } from "./rag.js";
import { v4 as uuid } from "uuid";
import type { Article } from "../../shared/types.js";

let scheduledTask: cron.ScheduledTask | null = null;

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

        console.log(`[Scheduler] Briefing generated: ${briefingId}`);
      } catch (err) {
        console.error("[Scheduler] Failed:", err);
      }
    },
    { timezone: "America/New_York" }
  );

  console.log(`Scheduler started: ${cronExpr} (America/New_York)`);
}
```

- [ ] **Step 3: Add scheduler to server/index.ts**

```typescript
import { startScheduler } from "./services/scheduler.js";

// After all other init:
startScheduler();
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: node-cron scheduler for daily briefing (8AM EST)"
```

---

### Task 12: ElevenLabs TTS Podcast

**Files:**
- Create: `server/services/tts.ts`
- Create: `server/routes/tts.ts`
- Create: `client/src/components/AudioPlayer.tsx`
- Modify: `server/index.ts`

- [ ] **Step 1: Create server/services/tts.ts**

```typescript
import { getSettings } from "../db/sqlite.js";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, "../../data/audio");

export async function generatePodcastAudio(
  briefingId: string,
  summary: string,
  articles: Array<{ title: string; summary: string }>
): Promise<string> {
  const settings = getSettings();
  if (!settings.elevenlabsApiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  const client = new Anthropic({ apiKey: settings.claudeApiKey });

  const articleList = articles
    .map((a, i) => `${i + 1}. ${a.title}: ${a.summary}`)
    .join("\n");

  const scriptResponse = await client.messages.create({
    model: settings.model || "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Rewrite this news briefing as a natural podcast script for a single host. Make it conversational, engaging, with smooth transitions. Keep it under 3 minutes when read aloud.

## Daily Summary
${summary}

## Articles
${articleList}

Write the script as plain text, ready to be read aloud. No stage directions.`,
      },
    ],
  });

  const script =
    scriptResponse.content[0].type === "text"
      ? scriptResponse.content[0].text
      : "";

  const ttsResponse = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": settings.elevenlabsApiKey,
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!ttsResponse.ok) {
    throw new Error(`ElevenLabs API error: ${ttsResponse.statusText}`);
  }

  if (!existsSync(AUDIO_DIR)) mkdirSync(AUDIO_DIR, { recursive: true });

  const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
  const fileName = `${briefingId}.mp3`;
  writeFileSync(join(AUDIO_DIR, fileName), audioBuffer);

  return fileName;
}
```

- [ ] **Step 2: Create server/routes/tts.ts**

```typescript
import { Router } from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { getDb } from "../db/sqlite.js";
import { generatePodcastAudio } from "../services/tts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, "../../data/audio");

const router = Router();

router.post("/generate", async (req, res) => {
  const { briefingId } = req.body as { briefingId: string };
  const db = getDb();

  const briefing = db
    .prepare("SELECT * FROM briefings WHERE id = ?")
    .get(briefingId) as Record<string, string> | undefined;

  if (!briefing) {
    res.status(404).json({ error: "Briefing not found" });
    return;
  }

  const articles = db
    .prepare("SELECT title, summary FROM articles WHERE briefing_id = ?")
    .all(briefingId) as Array<{ title: string; summary: string }>;

  try {
    const fileName = await generatePodcastAudio(briefingId, briefing.summary, articles);
    res.json({ audioUrl: `/api/tts/${fileName}` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "TTS failed" });
  }
});

router.get("/:filename", (req, res) => {
  const filePath = join(AUDIO_DIR, req.params.filename);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "Audio not found" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
```

- [ ] **Step 3: Add TTS route to server/index.ts**

```typescript
import ttsRouter from "./routes/tts.js";

app.use("/api/tts", ttsRouter);
```

- [ ] **Step 4: Create client/src/components/AudioPlayer.tsx**

```tsx
import { useState } from "react";
import { Play, Pause, Loader2, Mic } from "lucide-react";

interface AudioPlayerProps {
  briefingId: string | null;
  hasElevenlabsKey: boolean;
}

export function AudioPlayer({ briefingId, hasElevenlabsKey }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => new Audio());

  async function handleGenerate() {
    if (!briefingId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefingId }),
      });
      const data = await res.json();
      setAudioUrl(data.audioUrl);
    } catch (e) {
      console.error("TTS generation failed:", e);
    } finally {
      setGenerating(false);
    }
  }

  function togglePlay() {
    if (!audioUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.src = audioUrl;
      audio.play();
      setPlaying(true);
      audio.onended = () => setPlaying(false);
    }
  }

  if (!hasElevenlabsKey) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <Mic size={18} className="text-purple-400" />
      <span className="text-sm text-zinc-300">Podcast Mode</span>
      {!audioUrl ? (
        <button
          onClick={handleGenerate}
          disabled={generating || !briefingId}
          className="ml-auto flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : "Generate Audio"}
        </button>
      ) : (
        <button
          onClick={togglePlay}
          className="ml-auto rounded-full bg-purple-600 p-2 text-white hover:bg-purple-700"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Integrate AudioPlayer in Dashboard.tsx**

Add import and place after the daily summary section:

```tsx
import { AudioPlayer } from "./AudioPlayer";

// Inside the briefing render, after the summary card:
<AudioPlayer
  briefingId={briefing?.id || null}
  hasElevenlabsKey={!!config?.elevenlabsApiKey}
/>
```

This requires fetching settings in Dashboard (add a `useEffect` to call `api.getSettings()` and store `elevenlabsApiKey` status).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Phase 3 — ElevenLabs TTS podcast audio generation + player"
```

---

### Task 13: Update CLAUDE.md with Finalized Tech Stack

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update Tech Stack section in CLAUDE.md**

Replace the Tech Stack and Web Search entries with the finalized selections:

```markdown
## Tech Stack

- **Frontend**: React 19 + TypeScript (Vite) + Tailwind v4 + shadcn/ui
- **Backend**: Node.js + Express
- **LLM**: Claude API (Anthropic SDK) — BYOK, web_search_20250305 tool
- **Vector DB**: Vectra (local JSON-based)
- **Embedding**: @huggingface/transformers (all-MiniLM-L6-v2, local)
- **DB**: SQLite (better-sqlite3)
- **MCP**: Obsidian vault MCP server (existing, Python/FastMCP)
- **Scheduler**: node-cron
- **TTS**: ElevenLabs API — BYOK, optional
- **Package Manager**: pnpm
- **Server Runtime**: tsx (no transpilation)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with finalized tech stack"
```
