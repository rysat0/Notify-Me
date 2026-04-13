import express from "express";
import cors from "cors";
import { initDb, getSettings } from "./db/sqlite.js";
import settingsRouter from "./routes/settings.js";
import inkboxRouter from "./routes/inkbox.js";
import briefingRouter from "./routes/briefing.js";
import { initInkbox } from "./services/inkbox.js";
import { initMcpClient } from "./mcp/client.js";
import { initEmbedding } from "./services/embedding.js";
import { initRag } from "./services/rag.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDb();

initMcpClient().catch(() => {
  console.log("Obsidian MCP not available — continuing without vault.");
});

initEmbedding().then(() => initRag()).then(() => {
  console.log("RAG system ready.");
}).catch((err) => {
  console.warn("RAG init failed (non-fatal):", err);
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/settings", settingsRouter);
app.use("/api/inkbox", inkboxRouter);
app.use("/api/brief", briefingRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Auto-init Inkbox if configured
  const settings = getSettings();
  if (settings.inkboxApiKey) {
    initInkbox(settings.inkboxApiKey, settings.inkboxIdentityHandle || "notify-me").catch(() =>
      console.log("Inkbox auto-init skipped — configure API key in Settings.")
    );
  }
});
