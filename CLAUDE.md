# Notify Me — CLAUDE.md

## Project Overview

AI-powered personalized daily news briefing web app. Built for a US-based hackathon (2-hour time limit).  
Claude API (BYOK) for LLM, optional ElevenLabs TTS (BYOK) for podcast-style audio.

## Documentation Rules

**All documentation MUST be maintained in both Japanese and English.**

| Type | Japanese | English |
|------|----------|---------|
| Project Overview | `docs/PROJECT_OVERVIEW.md` | `docs/PROJECT_OVERVIEW.en.md` |
| API Documentation | `docs/API.md` | `docs/API.en.md` |
| Setup Guide | `docs/SETUP.md` | `docs/SETUP.en.md` |
| Architecture | `docs/ARCHITECTURE.md` | `docs/ARCHITECTURE.en.md` |

Naming convention: `{name}.md` (Japanese), `{name}.en.md` (English).  
When creating or updating any doc, always update both language versions.

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express
- **LLM**: Claude API (Anthropic SDK) — BYOK
- **Vector DB**: ChromaDB or sqlite-vec
- **DB**: SQLite
- **MCP Server**: TypeScript (MCP SDK)
- **Scheduler**: node-cron
- **TTS**: ElevenLabs API — BYOK, optional
- **Web Search**: Brave Search API / Tavily

## External Knowledge Source — Obsidian Vault

This project connects to the developer's Obsidian vault via MCP server for:
- Accessing 105,000+ lines of curated dev research (ElevenLabs, MCP, AI-tools, etc.)
- Leveraging daily digests and wiki knowledge
- Cross-referencing past research with new articles

Vault MCP server: `vault-mcp-server.py` in the Obsidian vault  
Vault path: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/My Value/`

### Available MCP Tools (from Obsidian vault)
- `search_vault(query, scope)` — Search vault by keyword
- `read_wiki(topic)` — Read a wiki topic note
- `read_daily(date, mode)` — Read daily digest
- `list_people()` — List people notes
- `list_projects()` — List project notes
- `vault_stats()` — Vault statistics

## Coding Conventions

- TypeScript strict mode
- ESM imports (`import`/`export`, not `require`)
- API keys stored in `.env`, never committed
- Error messages in English (user-facing content in configured language)
- Comments in English

## Architecture Principles

- BYOK: all API keys provided by the user at runtime, stored locally only
- Local-first: everything runs on localhost, no external deployment needed
- MCP for RAG: use MCP protocol to connect Claude with vector DB for deduplication
- Modular phases: MVP works standalone, each phase adds independent features
