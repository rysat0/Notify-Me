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
    inkboxApiKey: settings.inkboxApiKey ? "ApiKey_...configured" : "",
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
    inkboxApiKey: settings.inkboxApiKey ? "ApiKey_...configured" : "",
  });
});

export default router;
