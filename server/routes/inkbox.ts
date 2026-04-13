import { Router } from "express";
import { getSettings } from "../db/sqlite.js";
import { initInkbox, getInkboxStatus } from "../services/inkbox.js";

const router = Router();

// POST /api/inkbox/setup — create or reconnect Identity
router.post("/setup", async (req, res) => {
  const settings = getSettings();
  if (!settings.inkboxApiKey) {
    res.status(400).json({ error: "Inkbox API key not configured" });
    return;
  }

  const status = await initInkbox(
    settings.inkboxApiKey,
    settings.inkboxIdentityHandle || "notify-me"
  );
  res.json(status);
});

// GET /api/inkbox/status
router.get("/status", (_req, res) => {
  res.json(getInkboxStatus());
});

export default router;
