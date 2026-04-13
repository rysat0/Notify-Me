# 技術選定デザイン — Notify Me

> 2026-04-13 作成

## 概要

Notify Me は、Claude API (BYOK) + Inkbox SDK を使った パーソナライズドAIニュースブリーフィングWebアプリ。Hack-a-Sprint 2026（2.5時間ハッカソン）で構築する。Inkbox のAIエージェント Identity を持ち、ニュースブリーフィングをメールで自動配信する。本ドキュメントは技術選定と全体アーキテクチャの設計仕様。

---

## 1. 全体アーキテクチャ

Vite + Express 統合型。Vite の proxy で `/api/*` を Express に転送。

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
│  │ ニュース取得  │  │ 深掘り会話   │  │ 設定CRUD     │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────────┘  │
│         │                │                              │
│  ┌──────▼────────────────▼──────┐                      │
│  │      Claude API Client       │                      │
│  │  (web_search tool + chat)    │                      │
│  └──────────────────────────────┘                      │
│         │                                               │
│  ┌──────▼──────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Vectra      │  │ SQLite     │  │ ElevenLabs TTS │  │
│  │ (RAG/dedup) │  │ (設定/履歴) │  │ (optional)     │  │
│  └─────────────┘  └────────────┘  └────────────────┘  │
│         │                                               │
│  ┌──────▼──────────────────────┐  ┌────────────────┐  │
│  │ @huggingface/transformers   │  │ Inkbox SDK     │  │
│  │ (all-MiniLM-L6-v2 embedding)│  │ ・Identity     │  │
│  └─────────────────────────────┘  │ ・Email配信    │  │
│                                    │ ・Email受信    │  │
│                                    │ ・Vault (鍵)   │  │
│                                    └────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │ (Phase 2: MCP接続)
┌────────▼────────────────────┐
│  Obsidian Vault MCP Server  │
│  (既存 vault-mcp-server.py) │
└─────────────────────────────┘
```

---

## 2. 技術選定サマリー

| 決定 | 選択 | 却下した選択肢 | 判断根拠 |
|------|------|-------------|---------|
| ニュース取得 | Claude API web_search | Brave Search, Tavily, NewsAPI | 追加キー不要。1回のAPI呼び出しで検索+要約が完結 |
| ベクトルDB | Vectra (TS/JSON) | ChromaDB, sqlite-vec | Node.js同一プロセス、セットアップゼロ、ハッカソン規模で十分 |
| Embedding | @xenova/transformers (all-MiniLM-L6-v2) | OpenAI Embeddings, Claude判定 | ローカル完結、追加キー不要、BYOK思想と合致 |
| UI | Tailwind CSS + shadcn/ui | Mantine, Chakra, Tailwindのみ | デモ映え+軽量コピー方式で必要分だけ導入 |
| RAG接続 | ハイブリッド（直接統合→MCP移行） | フルMCP, 直接のみ | Phase 1を確実に動かしつつPhase 2でMCPの技術デモが可能 |
| アーキテクチャ | Vite proxy + Express | 分離型, Express一体型 | HMR+API分離のバランス。`npm run dev` 一発起動 |
| DB | SQLite (better-sqlite3) | PostgreSQL, MongoDB | ローカル完結、ファイル1つ、十分な機能 |
| サーバ実行 | tsx | ts-node, tsc+node | トランスパイル不要で即実行、開発速度最優先 |
| 外部知識 | Obsidian vault MCP (既存) | 新規構築 | すでに動いているMCPサーバを再利用 |
| LLMモデル | claude-sonnet-4-20250514 | Opus, Haiku | 速度・コスト・品質のバランス |
| AIエージェント基盤 | Inkbox SDK (@inkbox/sdk) | 自前SMTP, SendGrid | ハッカソン必須要件。Identity+Email+Vault一体型 |

---

## 3. ディレクトリ構成

```
Notify-Me/
├── CLAUDE.md
├── package.json              # ルート（concurrently でfront+back同時起動）
├── .env                      # CLAUDE_API_KEY 等（gitignore済み）
│
├── client/                   # Frontend
│   ├── index.html
│   ├── vite.config.ts        # proxy設定
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui コンポーネント
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── ArticleCard.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── AudioPlayer.tsx
│   │   ├── lib/
│   │   │   └── api.ts        # fetch wrapper (/api/*)
│   │   └── types/
│   │       └── index.ts
│   └── package.json
│
├── server/                   # Backend
│   ├── index.ts              # Express エントリポイント
│   ├── routes/
│   │   ├── briefing.ts       # GET /api/brief, POST /api/brief/generate
│   │   ├── chat.ts           # POST /api/chat
│   │   ├── settings.ts       # GET/PUT /api/settings
│   │   └── tts.ts            # POST /api/tts (optional)
│   ├── services/
│   │   ├── claude.ts         # Claude API client (web_search + chat)
│   │   ├── inkbox.ts         # Inkbox SDK: Identity管理 + メール送受信
│   │   ├── rag.ts            # Vectra + embedding 管理
│   │   ├── scheduler.ts      # node-cron (Phase 3)
│   │   └── tts.ts            # ElevenLabs client (Phase 3)
│   ├── db/
│   │   ├── sqlite.ts         # SQLite接続 (better-sqlite3)
│   │   └── schema.sql        # テーブル定義
│   ├── mcp/                  # Phase 2: MCP統合
│   │   └── client.ts         # Obsidian vault MCP client
│   └── package.json
│
├── shared/                   # Front/Back 共有
│   └── types.ts              # Article, UserConfig, ChatMessage 型
│
└── docs/
    ├── PROJECT_OVERVIEW.md
    └── PROJECT_OVERVIEW.en.md
```

---

## 4. データフロー

### ブリーフィング生成

```
POST /api/brief/generate { categories, language, timeRange }
  → Claude API (web_search tool) でカテゴリごとに検索+要約
  → @huggingface/transformers で各記事をembedding化
  → Vectra で類似記事検索 (cosine > 0.85)
    → 重複あり: スキップ or 「続報」フラグ
    → 重複なし: 新規記事として保存
  → SQLite に記事メタデータ + ブリーフィング履歴保存
  → Inkbox Identity でHTMLメールを配信先に送信
  → レスポンス: { summary, articles[], relatedPast[] }
```

### メール受信コマンド (Phase 2)

```
受信メール → Inkbox iterUnreadEmails() でポーリング
  → メール本文をパース（"tech news", "change language ja" 等）
  → コマンドに応じて設定変更 or ブリーフィング生成
  → 結果をメール返信で通知
```

### チャット深掘り (Phase 3)

```
POST /api/chat { message, articleRefs[] }
  → articleRefs から記事コンテキストを取得
  → Claude API にコンテキスト + ユーザメッセージ送信
  → レスポンス: { reply, citations[] }
```

---

## 5. APIエンドポイント

| Method | Path | 説明 | Phase |
|--------|------|------|-------|
| `GET` | `/api/settings` | ユーザ設定取得 | 1 |
| `PUT` | `/api/settings` | ユーザ設定更新 | 1 |
| `POST` | `/api/brief/generate` | ブリーフィング生成 | 1 |
| `GET` | `/api/brief/latest` | 最新ブリーフィング取得 | 1 |
| `GET` | `/api/brief/history` | 過去ブリーフィング一覧 | 2 |
| `POST` | `/api/inkbox/setup` | Inkbox Identity作成 + メールボックス設定 | 1 |
| `GET` | `/api/inkbox/status` | Inkbox Identity状態確認 | 1 |
| `POST` | `/api/inkbox/check-mail` | 受信メールコマンド処理 | 2 |
| `POST` | `/api/chat` | 記事深掘りチャット | 3 |
| `POST` | `/api/tts/generate` | Podcast音声生成 | 3 |
| `GET` | `/api/tts/:id` | 生成済み音声取得 | 3 |

---

## 6. SQLite スキーマ

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
  schedule_time TEXT DEFAULT '0 8 * * *',
  inkbox_api_key TEXT DEFAULT '',
  inkbox_identity_handle TEXT DEFAULT 'notify-me',
  delivery_email TEXT DEFAULT ''
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

## 7. フェーズ別スコープ

### Phase 1: MVP + Inkbox メール配信（目標70分）
- プロジェクトスキャフォールド（Vite + Express + Tailwind + shadcn/ui）
- SQLite セットアップ + 設定テーブル
- 設定画面（APIキー入力 + カテゴリ・言語・時間範囲 + Inkbox設定）
- Claude API web_search でニュース取得 → 要約 + 本文生成
- **Inkbox Identity 作成 + ブリーフィングをHTMLメールで配信**
- ダッシュボードに結果表示

### Phase 2: RAG + Inkbox 拡張（目標30分）
- Vectra + @huggingface/transformers でRAG構築
- 記事保存時にembedding生成 → Vectra格納
- 重複排除 + 関連記事フラグ
- **Inkbox メール受信コマンド処理**（メール返信でカテゴリ変更等）
- **Inkbox Vault でAPIキー暗号化保存**
- Obsidian vault MCPクライアント接続（時間許容時）

### Phase 3: 拡張機能（残り時間）
1. チャット深掘り機能（記事引用→Claude対話）
2. node-cron スケジューラ（メール配信付き）
3. ElevenLabs TTS Podcast生成

---

## 8. 依存パッケージ

```
# client/
react, react-dom, react-router-dom
tailwindcss, @tailwindcss/vite
shadcn/ui (card, button, input, tabs, dialog, select)
lucide-react

# server/
express, cors
@anthropic-ai/sdk
@inkbox/sdk
better-sqlite3
vectra
@huggingface/transformers
@modelcontextprotocol/sdk
node-cron
uuid

# root
concurrently
typescript, tsx
```

---

## 9. リスクと対策

| リスク | 対策 |
|--------|------|
| Embedding初回ロード（~30MB DL） | サーバ起動時にpre-load |
| Claude web_search レスポンス形式の不確実性 | Anthropic SDK型定義に準拠、パース失敗時fallback |
| APIキー平文保存 | localhost前提で許容。.envをプライマリに |
| cosine閾値 0.85 の妥当性 | デフォルト値として採用、実測後に調整可能 |
| 同時生成リクエスト | UIでボタンdisable + サーバ側フラグ |
| Phase 2 MCP接続 | @modelcontextprotocol/sdk Client で stdio接続 |
| Inkbox API 未検証アカウント制限 | 事前にIdentity作成+メール認証完了。未認証時は10通/日 |
| Inkbox Vault 鍵管理 | vault key を .env に保存、サーバ起動時に unlock |
