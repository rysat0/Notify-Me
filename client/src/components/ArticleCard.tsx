import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Article } from "@shared/types";

export function ArticleCard({ article }: { article: Article }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-100">{article.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {article.source} &middot; {article.category}
            {article.isFollowUp && (
              <span className="ml-2 rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">
                Follow-up
              </span>
            )}
          </p>
        </div>
        {article.sourceUrl && (
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      <p className="text-sm text-zinc-300">{article.summary}</p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Collapse" : "Read more"}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-zinc-800 pt-3 text-sm leading-relaxed text-zinc-300">
          {article.body}
        </div>
      )}
    </div>
  );
}
