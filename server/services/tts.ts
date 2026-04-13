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
