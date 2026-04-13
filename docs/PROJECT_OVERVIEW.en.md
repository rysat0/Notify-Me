# Notify Me — Project Overview

> A personalized AI news briefing web app delivered every morning

## Concept

A research app that lets you wake up to a customized summary of "what happened while you slept." Uses Claude API via BYOK (Bring Your Own Key), running entirely on localhost.

## Constraints

| Item | Detail |
|------|--------|
| Dev Time | 2 hours (hackathon) |
| Environment | Localhost |
| Type | Web Application |
| LLM | Claude API (BYOK) |
| TTS | ElevenLabs API (BYOK, optional) |

---

## Core Features

### 1. Daily News Briefing

Automatically generates a **daily summary** and **full articles** for your specified topics every morning at 8:00 AM EST.

#### Customization Options

| Parameter | Description | Examples |
|-----------|-------------|----------|
| **Language** | Output language selection | English / Japanese / Chinese |
| **Summary Length** | Detail level of daily summary | Short (3 lines) / Standard / Detailed |
| **Article Length** | Detail level of each article | Key points only / Standard / Deep dive |
| **News Genre** | Categories of interest | Tech, AI, Finance, Politics, etc. |
| **Time Range** | How far back to fetch | Past 6h / 12h / 24h / 48h |
| **Source Types** | Sites and sources to pull from | Major media / Tech blogs / Academic papers / SNS / RSS |

### 2. RAG-based Deduplication & Linking

- Build a vector store in a local DB
- Vectorize and store all previously delivered news
- **Deduplication**: Never re-introduce articles already presented
- **Linking**: When related to past articles, present them together ("This is a follow-up to...")

#### Technical Architecture

```
[Web Search / RSS] → [Claude API] → [Summary & Article Generation]
                          ↕
                [Local Vector DB (RAG)]
                          ↕
                    [MCP Server]
```

- **Vector DB**: SQLite + vector extension (sqlite-vec) or ChromaDB
- **MCP Server**: Connects RAG to Claude for past article search and deduplication

### 3. Chat-based Deep Dive

Dive deeper into any article through a chat interface with Claude.

- **One-tap / two-tap** citation selection from today's article list
- Automatically inserts article context into the chat
- Claude explains background, related information, and future outlook in a conversational format

---

## Optional Features

### 4. Podcast-style Audio (ElevenLabs TTS)

An additional feature activated by providing an ElevenLabs API key via BYOK.

1. Claude rewrites summaries/articles into a **podcast-style script**
2. ElevenLabs TTS generates audio
3. **Playback** directly in the web app player

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Dashboard  │ │Settings  │ │Chat      │ │Audio   │ │
│  │           │ │          │ │          │ │Player  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                  Backend (Node.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Scheduler  │ │Claude    │ │MCP       │ │TTS     │ │
│  │(cron)     │ │API Client│ │Server    │ │Service │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────┬───────────┬───────────┬──────────────────┘
           │           │           │
     ┌─────▼─────┐ ┌──▼───┐ ┌───▼────┐
     │Vector DB  │ │SQLite│ │External│
     │(RAG)      │ │(conf)│ │APIs    │
     └───────────┘ └──────┘ └────────┘
```

## Tech Stack (Planned)

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express |
| LLM | Claude API (Anthropic SDK) |
| Vector DB | ChromaDB or sqlite-vec |
| DB | SQLite |
| MCP Server | TypeScript (MCP SDK) |
| Scheduler | node-cron |
| TTS | ElevenLabs API (optional) |
| Web Search | Brave Search API / Tavily / Web scraping |

---

## Development Priority (2-Hour Hackathon Strategy)

### Phase 1: MVP (Top Priority — Target 60 min)
- [ ] Project setup (Vite + Express)
- [ ] BYOK settings screen (Claude API key input)
- [ ] Basic news fetching + Claude summary generation
- [ ] Dashboard displaying summaries and articles

### Phase 2: Differentiating Features (Target 30 min)
- [ ] RAG vector DB (deduplication & linking)
- [ ] MCP server connecting RAG to Claude
- [ ] Customization settings (language, genre, time range, etc.)

### Phase 3: Extended Features (Remaining time)
- [ ] Chat deep-dive (one-tap article citation)
- [ ] Scheduler (cron: daily 8AM EST)
- [ ] ElevenLabs TTS podcast audio generation

---

## Screen Layout

| Screen | Description |
|--------|-------------|
| **Dashboard** | Today's briefing (summary + article list) |
| **Settings** | API key input, language, genre, sources, time range |
| **Article Detail** | Individual article body + related past articles |
| **Chat** | Conversational deep-dive with article citations |
| **Audio** | Podcast-style audio player (optional) |

---

## Data Models (Overview)

### News Article
```
Article {
  id: string
  title: string
  summary: string
  body: string
  source: string
  sourceUrl: string
  category: string
  language: string
  publishedAt: datetime
  fetchedAt: datetime
  embedding: vector    // For RAG
}
```

### User Configuration
```
UserConfig {
  claudeApiKey: string (encrypted)
  elevenlabsApiKey?: string (encrypted)
  language: "en" | "ja" | "zh"
  summaryLength: "short" | "medium" | "detailed"
  bodyLength: "brief" | "standard" | "deep"
  categories: string[]
  timeRange: number (hours)
  sources: string[]
  scheduleTime: string (cron expression)
}
```

### Chat History
```
ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  articleRefs: string[]  // Referenced article IDs
  createdAt: datetime
}
```
