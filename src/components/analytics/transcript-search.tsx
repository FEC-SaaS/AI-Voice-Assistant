"use client";

import { useCallback, useRef, useState } from "react";
import { Search, Loader2, Play, Pause, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

// ── Inline recording player ──────────────────────────────────────────
function RecordingPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} preload="none" />
      <Button variant="outline" size="sm" onClick={toggle} className="h-7 px-2.5 gap-1.5">
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        <span className="text-xs">{playing ? "Pause" : "Play"}</span>
      </Button>
    </div>
  );
}

// ── Highlight matching text ──────────────────────────────────────────
function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300/30 text-yellow-200 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function TranscriptSearch() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: results, isLoading } = trpc.analytics.searchTranscripts.useQuery(
    { query: submitted },
    { enabled: submitted.length >= 2 }
  );

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (q.length >= 2) setSubmitted(q);
  }, [query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Transcript Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search across all call transcripts… (min 2 characters)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={query.trim().length < 2 || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Results count */}
        {submitted && !isLoading && results !== undefined && (
          <p className="text-xs text-muted-foreground">
            {results.length === 0
              ? `No transcripts contain \u201c${submitted}\u201d`
              : `${results.length} result${results.length === 1 ? "" : "s"} for \u201c${submitted}\u201d`}
          </p>
        )}

        {/* Results list */}
        {results && results.length > 0 && (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {results.map((result) => (
              <div
                key={result.id}
                className="rounded-lg border bg-card p-3 space-y-2"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.agentName && (
                      <Badge variant="outline" className="text-xs">
                        {result.agentName}
                      </Badge>
                    )}
                    {result.contactName && (
                      <span className="text-xs text-muted-foreground">
                        {result.contactName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {result.toNumber || result.fromNumber || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </span>
                    <Badge
                      variant={result.status === "completed" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {result.status}
                    </Badge>
                  </div>
                </div>

                {/* Transcript snippet */}
                {result.snippet && (
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed bg-secondary/50 rounded p-2 break-words">
                    <Highlighted text={result.snippet} query={submitted} />
                  </p>
                )}

                {/* Recording player */}
                {result.recordingUrl && (
                  <div className="flex items-center gap-2">
                    <Mic className="h-3 w-3 text-muted-foreground shrink-0" />
                    <RecordingPlayer url={result.recordingUrl} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
