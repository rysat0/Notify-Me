import { useState, useRef, useEffect } from "react";
import { Send, Loader2, X } from "lucide-react";
import type { Article } from "@shared/types";

interface ChatProps {
  articles: Article[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat({ articles }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function toggleRef(id: string) {
    setSelectedRefs((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, articleRefs: selectedRefs }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Failed to get response" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {articles.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs text-zinc-500">Tap articles to reference in chat:</p>
          <div className="flex flex-wrap gap-1">
            {articles.map((a) => (
              <button
                key={a.id}
                onClick={() => toggleRef(a.id)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  selectedRefs.includes(a.id)
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {a.title.slice(0, 40)}...
                {selectedRefs.includes(a.id) && <X size={10} className="ml-1 inline" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-600">
            Ask anything about today's articles...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-12 bg-blue-900/50 text-blue-100"
                : "mr-12 bg-zinc-800 text-zinc-200"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="mr-12 flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-400">
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about the articles..."
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
