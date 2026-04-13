import express from "express";
import cors from "cors";
import { initDb } from "./db/sqlite.js";
import settingsRouter from "./routes/settings.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDb();

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/settings", settingsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
