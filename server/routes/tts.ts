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
