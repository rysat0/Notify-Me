import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import type { UserConfig, InkboxStatus } from "@shared/types";

const CATEGORIES = [
  "tech",
  "ai",
  "finance",
  "politics",
  "science",
  "business",
  "startups",
  "security",
];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

export function Settings() {
  const [config, setConfig] = useState<Partial<UserConfig>>({});
  const [claudeKey, setClaudeKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [inkboxKey, setInkboxKey] = useState("");
  const [inkboxStatus, setInkboxStatus] = useState<InkboxStatus>({ connected: false, identityHandle: null, emailAddress: null });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setConfig(s));
    api.getInkboxStatus().then(setInkboxStatus).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    const updates: Partial<UserConfig> = { ...config };
    if (claudeKey) updates.claudeApiKey = claudeKey;
    if (elevenlabsKey) updates.elevenlabsApiKey = elevenlabsKey;
    if (inkboxKey) updates.inkboxApiKey = inkboxKey;

    await api.updateSettings(updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // Auto-setup Inkbox if key was just provided
    if (inkboxKey) {
      api.setupInkbox().then(setInkboxStatus).catch(() => {});
    }
  }

  function toggleCategory(cat: string) {
    const current = config.categories || [];
    const next = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    setConfig({ ...config, categories: next });
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Settings</h2>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-300">API Keys (BYOK)</h3>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Claude API Key *
          </label>
          <input
            type="password"
            placeholder={config.claudeApiKey || "sk-ant-..."}
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            ElevenLabs API Key (optional — enables podcast audio)
          </label>
          <input
            type="password"
            placeholder={config.elevenlabsApiKey || "sk-..."}
            value={elevenlabsKey}
            onChange={(e) => setElevenlabsKey(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-zinc-300">Inkbox Agent</h3>
        {inkboxStatus.connected && (
          <div className="rounded-lg border border-green-800 bg-green-950 p-3 text-sm">
            <span className="text-green-400">Connected</span>
            <span className="ml-2 text-zinc-400">{inkboxStatus.emailAddress}</span>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Inkbox API Key *
          </label>
          <input
            type="password"
            placeholder={config.inkboxApiKey || "ApiKey_..."}
            value={inkboxKey}
            onChange={(e) => setInkboxKey(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Identity Handle
          </label>
          <input
            type="text"
            value={config.inkboxIdentityHandle || "notify-me"}
            onChange={(e) =>
              setConfig({ ...config, inkboxIdentityHandle: e.target.value })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Delivery Email (briefings sent here)
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={config.deliveryEmail || ""}
            onChange={(e) =>
              setConfig({ ...config, deliveryEmail: e.target.value })
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">Language</h3>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() =>
                setConfig({
                  ...config,
                  language: lang.value as UserConfig["language"],
                })
              }
              className={`rounded-lg px-4 py-2 text-sm ${
                config.language === lang.value
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">News Categories</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm capitalize ${
                config.categories?.includes(cat)
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">
          Time Range: {config.timeRange || 24}h
        </h3>
        <input
          type="range"
          min={6}
          max={48}
          step={6}
          value={config.timeRange || 24}
          onChange={(e) =>
            setConfig({ ...config, timeRange: Number(e.target.value) })
          }
          className="w-full"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>6h</span>
          <span>12h</span>
          <span>24h</span>
          <span>48h</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300">Summary Length</h3>
          {(["short", "medium", "detailed"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="summaryLength"
                checked={config.summaryLength === opt}
                onChange={() => setConfig({ ...config, summaryLength: opt })}
                className="accent-blue-600"
              />
              <span className="capitalize text-zinc-400">{opt}</span>
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300">Article Length</h3>
          {(["brief", "standard", "deep"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bodyLength"
                checked={config.bodyLength === opt}
                onChange={() => setConfig({ ...config, bodyLength: opt })}
                className="accent-blue-600"
              />
              <span className="capitalize text-zinc-400">{opt}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-300">Claude Model</h3>
        <p className="text-xs text-zinc-500">
          Choose the model for news search and summarization.
        </p>
        {(
          [
            {
              value: "claude-sonnet-4-20250514",
              label: "Sonnet 4",
              desc: "Balanced speed/quality (recommended)",
            },
            {
              value: "claude-opus-4-20250514",
              label: "Opus 4",
              desc: "Highest quality, slower",
            },
            {
              value: "claude-haiku-4-5-20251001",
              label: "Haiku 4.5",
              desc: "Fastest, most affordable",
            },
          ] as const
        ).map((m) => (
          <label
            key={m.value}
            className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 cursor-pointer hover:border-zinc-600"
          >
            <input
              type="radio"
              name="model"
              checked={config.model === m.value}
              onChange={() => setConfig({ ...config, model: m.value })}
              className="accent-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-zinc-200">
                {m.label}
              </span>
              <span className="ml-2 text-xs text-zinc-500">{m.desc}</span>
            </div>
          </label>
        ))}
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
