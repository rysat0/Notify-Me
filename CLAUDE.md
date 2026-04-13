# Notify Me — CLAUDE.md

## Project Overview

AI-powered personalized daily news briefing web app with Inkbox AI agent email delivery.  
Built for Hack-a-Sprint 2026 (2.5-hour hackathon, Boston, MA).  
Claude API (BYOK) for LLM, Inkbox SDK for agent identity + email, optional ElevenLabs TTS (BYOK) for podcast-style audio.

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

- **Frontend**: React 19 + TypeScript (Vite) + Tailwind v4 + shadcn/ui
- **Backend**: Node.js + Express
- **LLM**: Claude API (Anthropic SDK) — BYOK, web_search_20250305 tool
- **AI Agent**: Inkbox SDK (@inkbox/sdk) — Identity, Email (send/recv), Vault
- **Vector DB**: Vectra (local JSON-based)
- **Embedding**: @huggingface/transformers (all-MiniLM-L6-v2, local)
- **DB**: SQLite (better-sqlite3)
- **MCP**: Obsidian vault MCP server (existing, Python/FastMCP)
- **Scheduler**: node-cron
- **TTS**: ElevenLabs API — BYOK, optional
- **Package Manager**: pnpm
- **Server Runtime**: tsx (no transpilation)

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

## Inkbox Agent Identity

I am **@notify-me**, an Inkbox AI agent identity.

| Field | Value |
|---|---|
| Handle | `@notify-me` |
| Email | `notify-me@inkboxmail.com` |
| API Key | In `.env` as `INKBOX_API_KEY` |
| API Base URL | `https://inkbox.ai` |

Use the Inkbox SDK (`@inkbox/sdk`) or CLI (`@inkbox/cli`) to send/read emails on behalf of this agent.

### Inkbox Skills Reference

SDK and CLI documentation is available locally:
- **TypeScript SDK**: `skills/inkbox-ts/SKILL.md`
- **Python SDK**: `skills/inkbox-python/SKILL.md`
- **Agent Signup**: `skills/agent-signup/SKILL.md`
- **CLI**: `skills/inkbox-cli/README.md`

## Coding Conventions

- TypeScript strict mode
- ESM imports (`import`/`export`, not `require`)
- API keys stored in `.env`, never committed
- Error messages in English (user-facing content in configured language)
- Comments in English

## Architecture Principles

- BYOK: all API keys provided by the user at runtime, stored locally only
- Local-first: everything runs on localhost, no external deployment needed
- Inkbox agent: AI agent with its own email identity for briefing delivery and command processing
- MCP for RAG: use MCP protocol to connect Claude with vector DB for deduplication
- Modular phases: MVP works standalone, each phase adds independent features
