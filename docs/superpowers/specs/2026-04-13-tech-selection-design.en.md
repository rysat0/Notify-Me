# Tech Selection Design — Notify Me

> Created 2026-04-13

## Overview

Notify Me is a personalized AI news briefing web app powered by Claude API (BYOK). Built within a 2-hour hackathon. This document specifies the tech selection and overall architecture design.

---

## 1. Overall Architecture

Vite + Express integrated architecture. Vite proxies `/api/*` requests to Express.

```
┌─ Browser ──────────────────────────────────────────────┐
│  React + TypeScript + Tailwind + shadcn/ui             │
│  Vite dev server (:5173)                               │
│    proxy /api/* →                                      │
└────────────────────┬───────────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────────┐
│  Express API (:3001)                                    │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ /api/brief   │  │ /api/chat   │  │ /api/settings │  │
│  │ News fetch   │  │ Deep dive   │  │ Settings CRUD │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────────┘  │
│         │                │                              │
│  ┌──────▼────────────────▼──────┐                      │
│  │      Claude API Client       │                      │
│  │  (web_search tool + chat)    │                      │
│  └──────────────────────────────┘                      │
│         │                                               │
│  ┌──────▼──────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Vectra      │  │ SQLite     │  │ ElevenLabs TTS │  │
│  │ (RAG/dedup) │  │ (settings) │  │ (optional)     │  │
│  └─────────────┘  └────────────┘  └────────────────┘  │
│         │                                               │
│  ┌──────▼──────────────────────┐                       │
│  │ @xenova/transformers        │                       │
│  │ (all-MiniLM-L6-v2 embedding)│                       │
│  └─────────────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
         │ (Phase 2: MCP connection)
┌────────▼────────────────────┐
│  Obsidian Vault MCP Server  │
│  (existing vault-mcp-server)│
└─────────────────────────────┘
```

---

## 2. Tech Selection Summary

| Decision | Choice | Rejected Alternatives | Rationale |
|----------|--------|----------------------|-----------|
| News fetching | Claude API web_search | Brave Search, Tavily, NewsAPI | No extra key needed. Search + summarize in one API call |
| Vector DB | Vectra (TS/JSON) | ChromaDB, sqlite-vec | Same Node.js process, zero setup, sufficient for hackathon scale |
| Embedding | @xenova/transformers (all-MiniLM-L6-v2) | OpenAI Embeddings, Claude-based | Fully local, no extra keys, aligns with BYOK philosophy |
| UI | Tailwind CSS + shadcn/ui | Mantine, Chakra, Tailwind only | Demo-ready polish + lightweight copy-paste approach |
| RAG connection | Hybrid (direct → MCP migration) | Full MCP, direct only | Ensures Phase 1 works, enables MCP tech demo in Phase 2 |
| Architecture | Vite proxy + Express | Separate servers, Express monolith | HMR + API separation balance. Single `npm run dev` startup |
| DB | SQLite (better-sqlite3) | PostgreSQL, MongoDB | Local-first, single file, sufficient features |
| Server runtime | tsx | ts-node, tsc+node | No transpilation needed, maximum dev speed |
| External knowledge | Obsidian vault MCP (existing) | Build new | Reuse already-running MCP server |
| LLM model | claude-sonnet-4-20250514 | Opus, Haiku | Speed/cost/quality balance |

---

## 3. Directory Structure

```
Notify-Me/
├── CLAUDE.md
├── package.json              # Root (concurrently runs front+back)
├── .env                      # CLAUDE_API_KEY etc. (gitignored)
│
├── client/                   # Frontend
│   ├── index.html
│   ├── vite.config.ts        # Proxy config
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── AudioPlayer.tsx
│   │   ├── lib/
│   │   │   └── api.ts        # Fetch wrapper (/api/*)
│   │   └── types/
│   │       └── index.ts
│   └── package.json
│
├── server/                   # Backend
│   ├── index.ts              # Express entry point
│   ├── routes/
│   │   ├── briefing.ts
│   │   ├── chat.ts
│   │   ├── settings.ts
│   │   └── tts.ts
│   ├── services/
│   │   ├── claude.ts         # Claude API client
│   │   ├── rag.ts            # Vectra + embedding
│   │   ├── scheduler.ts      # node-cron (Phase 3)
│   │   └── tts.ts            # ElevenLabs (Phase 3)
│   ├── db/
│   │   ├── sqlite.ts
│   │   └── schema.sql
│   ├── mcp/                  # Phase 2: MCP integration
│   │   └── client.ts
│   └── package.json
│
├── shared/                   # Shared types
│   └── types.ts
│
└── docs/
    ├── PROJECT_OVERVIEW.md
    └── PROJECT_OVERVIEW.en.md
```

---

## 4. Data Flow

### Briefing Generation

```
POST /api/brief/generate { categories, language, timeRange }
  → Claude API (web_search tool) searches + summarizes per category
  → @xenova/transformers generates embedding for each article
  → Vectra similarity search (cosine > 0.85)
    → Duplicate: skip or flag as "follow-up"
    → New: store as new article
  → SQLite stores article metadata + briefing history
  → Response: { summary, articles[], relatedPast[] }
```

### Chat Deep Dive (Phase 3)

```
POST /api/chat { message, articleRefs[] }
  → Retrieve article context from articleRefs
  → Send context + user message to Claude API
  → Response: { reply, citations[] }
```

---

## 5. API Endpoints

| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| `GET` | `/api/settings` | Get user settings | 1 |
| `PUT` | `/api/settings` | Update user settings | 1 |
| `POST` | `/api/brief/generate` | Generate briefing | 1 |
| `GET` | `/api/brief/latest` | Get latest briefing | 1 |
| `GET` | `/api/brief/history` | List past briefings | 2 |
| `POST` | `/api/chat` | Article deep-dive chat | 3 |
| `POST` | `/api/tts/generate` | Generate podcast audio | 3 |
| `GET` | `/api/tts/:id` | Get generated audio | 3 |

---

## 6. SQLite Schema

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  claude_api_key TEXT NOT NULL,
  elevenlabs_api_key TEXT,
  language TEXT DEFAULT 'en',
  summary_length TEXT DEFAULT 'medium',
  body_length TEXT DEFAULT 'standard',
  categories TEXT DEFAULT '["tech","ai"]',
  time_range INTEGER DEFAULT 24,
  sources TEXT DEFAULT '[]',
  schedule_time TEXT DEFAULT '0 8 * * *'
);

CREATE TABLE articles (
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
  briefing_id TEXT REFERENCES briefings(id)
);

CREATE TABLE briefings (
  id TEXT PRIMARY KEY,
  summary TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  settings_snapshot TEXT
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  article_refs TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 7. Phased Scope

### Phase 1: MVP (Target 60 min)
- Project scaffold (Vite + Express + Tailwind + shadcn/ui)
- SQLite setup + settings table
- Settings screen (API key input + categories, language, time range)
- Claude API web_search news fetching → summary + article generation
- Dashboard displaying results

### Phase 2: Differentiating Features (Target 30 min)
- Vectra + @xenova/transformers RAG setup
- Embedding generation on article save → Vectra storage
- Deduplication + related article flagging
- Obsidian vault MCP client connection (time permitting)

### Phase 3: Extended Features (Remaining time)
1. Chat deep-dive (article citation → Claude dialogue)
2. node-cron scheduler
3. ElevenLabs TTS podcast generation

---

## 8. Dependencies

```
# client/
react, react-dom, react-router-dom
tailwindcss, @tailwindcss/vite
shadcn/ui (card, button, input, tabs, dialog, select)
lucide-react

# server/
express, cors
@anthropic-ai/sdk
better-sqlite3
vectra
@xenova/transformers
@modelcontextprotocol/sdk
node-cron
uuid

# root
concurrently
typescript, tsx
```

---

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Embedding initial load (~30MB download) | Pre-load on server startup |
| Claude web_search response format uncertainty | Follow Anthropic SDK types, fallback on parse failure |
| API key stored in plaintext | Acceptable for localhost. .env as primary source |
| Cosine threshold 0.85 validity | Adopt as default, adjustable after testing |
| Concurrent generation requests | UI button disable + server-side flag |
| Phase 2 MCP connection | @modelcontextprotocol/sdk Client via stdio |
