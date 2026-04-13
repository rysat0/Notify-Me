import { Router } from "express";
import { processIncomingEmails } from "../services/mail-commands.js";

const router = Router();

// POST /api/inkbox/check-mail — manually trigger email command processing
router.post("/check-mail", async (_req, res) => {
  try {
    const processed = await processIncomingEmails();
    res.json({ processed });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to process emails" });
  }
});

export default router;
