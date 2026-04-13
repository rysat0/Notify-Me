import { useState } from "react";
import { Play, Pause, Loader2, Mic } from "lucide-react";

interface AudioPlayerProps {
  briefingId: string | null;
  hasElevenlabsKey: boolean;
}

export function AudioPlayer({ briefingId, hasElevenlabsKey }: AudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => new Audio());

  async function handleGenerate() {
    if (!briefingId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefingId }),
      });
      const data = await res.json();
      setAudioUrl(data.audioUrl);
    } catch (e) {
      console.error("TTS generation failed:", e);
    } finally {
      setGenerating(false);
    }
  }

  function togglePlay() {
    if (!audioUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.src = audioUrl;
      audio.play();
      setPlaying(true);
      audio.onended = () => setPlaying(false);
    }
  }

  if (!hasElevenlabsKey) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <Mic size={18} className="text-purple-400" />
      <span className="text-sm text-zinc-300">Podcast Mode</span>
      {!audioUrl ? (
        <button
          onClick={handleGenerate}
          disabled={generating || !briefingId}
          className="ml-auto flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : "Generate Audio"}
        </button>
      ) : (
        <button
          onClick={togglePlay}
          className="ml-auto rounded-full bg-purple-600 p-2 text-white hover:bg-purple-700"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      )}
    </div>
  );
}
