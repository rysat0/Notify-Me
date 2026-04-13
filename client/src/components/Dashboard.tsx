import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { ArticleCard } from "./ArticleCard";
import { AudioPlayer } from "./AudioPlayer";
import type { Article, BriefingResponse } from "@shared/types";

interface DashboardProps {
  onArticlesLoaded?: (articles: Article[]) => void;
}

export function Dashboard({ onArticlesLoaded }: DashboardProps) {
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasElevenlabsKey, setHasElevenlabsKey] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => {
      setHasElevenlabsKey(!!s.elevenlabsApiKey);
    });
  }, []);

  useEffect(() => {
    api
      .getLatestBriefing()
      .then((data) => {
        setBriefing(data);
        if (data) onArticlesLoaded?.(data.articles);
      })
      .catch((e) => setError(e.message))
      .finally(() => setInitialLoad(false));
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const data = await api.generateBriefing();
      setBriefing(data);
      onArticlesLoaded?.(data.articles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoad) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Today's Briefing</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {loading ? "Generating..." : "Generate Briefing"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {briefing && (
        <>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Daily Summary
            </h3>
            <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">
              {briefing.summary}
            </p>
            <p className="mt-3 text-xs text-zinc-600">
              Generated: {new Date(briefing.generatedAt).toLocaleString()}
            </p>
          </div>

          <AudioPlayer briefingId={briefing.id} hasElevenlabsKey={hasElevenlabsKey} />

          <div className="space-y-3">
            {briefing.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </>
      )}

      {!briefing && !loading && (
        <div className="py-20 text-center text-zinc-500">
          <p className="text-lg">No briefing yet</p>
          <p className="mt-1 text-sm">
            Configure your API key in Settings, then generate your first
            briefing.
          </p>
        </div>
      )}
    </div>
  );
}
