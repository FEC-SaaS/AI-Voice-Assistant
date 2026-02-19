"use client";

import { useState } from "react";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoicePreviewButtonProps {
  voiceId: string;
  text?: string;
}

export function VoicePreviewButton({ voiceId, text }: VoicePreviewButtonProps) {
  const [playing, setPlaying] = useState(false);

  const previewText =
    text ||
    `Hello! My name is ${voiceId}. I'm your AI voice assistant, ready to help you today. How can I assist you?`;

  function handlePreview() {
    if (!("speechSynthesis" in window)) {
      alert("Voice preview is not supported in your browser.");
      return;
    }

    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(previewText);

    // Try to find a voice that matches the voiceId name (best-effort)
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(voiceId.toLowerCase()) ||
        voiceId.toLowerCase().includes(v.name.split(" ")[0]?.toLowerCase() ?? "")
    );
    if (match) utterance.voice = match;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(utterance);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePreview}
      title={playing ? "Stop preview" : "Preview voice"}
    >
      {playing ? (
        <>
          <VolumeX className="h-4 w-4 mr-1.5" />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4 mr-1.5" />
          Preview
        </>
      )}
    </Button>
  );
}
