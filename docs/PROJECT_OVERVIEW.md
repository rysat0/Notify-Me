# Notify Me — プロジェクト概要

> パーソナライズされたAIニュースブリーフィングを毎朝届けるWebアプリ

## コンセプト

「寝ている間に世界で何が起きたか」を、自分好みにカスタマイズして毎朝受け取れるリサーチアプリ。Claude APIをBYOK（Bring Your Own Key）で利用し、ローカル環境で完結する。

## 制約

| 項目 | 内容 |
|------|------|
| 開発時間 | 2時間（ハッカソン） |
| 動作環境 | ローカルホスト |
| 形態 | Webアプリケーション |
| LLM | Claude API（BYOK） |
| TTS | ElevenLabs API（BYOK・オプション） |

---

## コア機能

### 1. デイリーニュースブリーフィング

毎朝アメリカ東部時間 8:00 AM に、指定したトピックの **デイリー要約** と **本文（詳細記事）** の2種類を自動生成する。

#### カスタマイズ項目

| パラメータ | 説明 | 例 |
|-----------|------|-----|
| **言語** | 出力言語の選択 | 英語 / 日本語 / 中国語 |
| **要約の長さ** | デイリー要約の文字数・詳細度 | 短め（3行）/ 標準 / 詳細 |
| **本文の長さ** | 各記事の本文の詳細度 | 要点のみ / 標準 / 深掘り |
| **ニュースジャンル** | 関心のあるカテゴリ | Tech, AI, Finance, Politics, etc. |
| **時間範囲** | どこまで遡って取得するか | 過去6時間 / 12時間 / 24時間 / 48時間 |
| **情報源の種類** | 引っ張るサイト・ソースの指定 | 大手メディア / テックブログ / 学術論文 / SNS / RSS |

### 2. RAGによる重複排除と関連付け

- ローカルDBにベクトルストアを構築
- 過去に配信したニュースをベクトル化して保存
- **重複排除**: すでに紹介したニュースを再度紹介しない
- **関連付け**: 過去の記事と関連がある場合、リンクして紹介（「この話題の続報です」等）

#### 技術構成

```
[Web検索 / RSS] → [Claude API] → [要約・本文生成]
                        ↕
              [ローカルベクトルDB (RAG)]
                        ↕
                  [MCPサーバ]
```

- **ベクトルDB**: SQLite + ベクトル拡張（sqlite-vec）またはChromaDB
- **MCPサーバ**: RAGとClaudeを接続し、過去記事の検索・重複チェックを実行

### 3. チャットによる深掘り機能

気になった記事についてClaudeとチャットで深掘りできる。

- 今日の記事一覧から **ワンタップ / ツータップ** で引用箇所を選択
- 選択した記事のコンテキストをチャットに自動挿入
- Claude が記事の背景、関連情報、今後の展望などを対話形式で説明

---

## オプション機能

### 4. Podcast風音声読み上げ（ElevenLabs TTS）

ElevenLabs APIキーをBYOKで設定すると有効化される追加機能。

1. Claude が要約・本文を **Podcast風のスクリプト** にリライト
2. ElevenLabs TTS で音声を生成
3. Webアプリ内の **プレーヤーで再生** 可能

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ダッシュ   │ │設定画面   │ │チャット   │ │音声    │ │
│  │ボード     │ │          │ │          │ │プレーヤ│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                  Backend (Node.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │スケジュー │ │Claude    │ │MCP       │ │TTS     │ │
│  │ラ (cron) │ │API Client│ │サーバ    │ │Service │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└──────────┬───────────┬───────────┬──────────────────┘
           │           │           │
     ┌─────▼─────┐ ┌──▼───┐ ┌───▼────┐
     │ベクトルDB  │ │SQLite│ │外部API │
     │(RAG)      │ │(設定)│ │(検索等)│
     └───────────┘ └──────┘ └────────┘
```

## 技術スタック（想定）

| レイヤー | 技術 |
|---------|------|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express |
| LLM | Claude API (Anthropic SDK) |
| ベクトルDB | ChromaDB or sqlite-vec |
| 通常DB | SQLite |
| MCPサーバ | TypeScript (MCP SDK) |
| スケジューラ | node-cron |
| TTS | ElevenLabs API（オプション） |
| Web検索 | Brave Search API / Tavily / Web scraping |

---

## 開発優先度（2時間ハッカソン戦略）

### Phase 1: MVP（最優先 — 目標60分）
- [ ] プロジェクトセットアップ（Vite + Express）
- [ ] BYOK設定画面（Claude APIキー入力）
- [ ] 基本的なニュース取得 + Claude要約生成
- [ ] ダッシュボードに要約・本文を表示

### Phase 2: 差別化機能（目標30分）
- [ ] RAGベクトルDB構築（重複排除・関連付け）
- [ ] MCPサーバでRAGとClaude接続
- [ ] カスタマイズ設定画面（言語・ジャンル・時間範囲等）

### Phase 3: 拡張機能（残り時間で）
- [ ] チャット深掘り機能（記事引用ワンタップ選択）
- [ ] スケジューラ（cron: 毎朝8AM EST）
- [ ] ElevenLabs TTS Podcast音声生成

---

## 画面構成

| 画面 | 概要 |
|------|------|
| **ダッシュボード** | 今日のブリーフィング（要約 + 記事一覧） |
| **設定** | APIキー入力、言語、ジャンル、情報源、時間範囲の設定 |
| **記事詳細** | 個別記事の本文表示 + 関連する過去記事 |
| **チャット** | 記事を引用しながらClaudeと対話 |
| **音声** | Podcast風音声の再生プレーヤ（オプション） |

---

## データモデル（概要）

### ニュース記事
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
  embedding: vector    // RAG用ベクトル
}
```

### ユーザ設定
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

### チャット履歴
```
ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  articleRefs: string[]  // 引用記事のID
  createdAt: datetime
}
```
