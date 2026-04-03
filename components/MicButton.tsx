"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface MicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  isListening: boolean;
  onListeningChange: (listening: boolean) => void;
}

export default function MicButton({
  onTranscript,
  disabled = false,
  isListening,
  onListeningChange,
}: MicButtonProps) {
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript) {
        transcriptRef.current = finalTranscript.trim();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      onListeningChange(false);
    };

    recognition.onend = () => {
      // Only fires when recognition actually stops
      if (transcriptRef.current) {
        onTranscript(transcriptRef.current);
        transcriptRef.current = "";
      }
      onListeningChange(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript, onListeningChange]);

  const toggle = useCallback(() => {
    if (disabled || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      transcriptRef.current = "";
      recognitionRef.current.start();
      onListeningChange(true);
    }
  }, [disabled, isListening, onListeningChange]);

  if (!supported) {
    return (
      <div className="text-zinc-500 text-xs text-center py-4">
        Speech recognition is not supported in this browser.
        <br />
        Please use Chrome or Edge.
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`
        relative w-16 h-16 rounded-full flex items-center justify-center
        transition-all duration-200 focus:outline-none focus-visible:ring-2
        focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900
        ${
          disabled
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            : isListening
              ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
              : "bg-white/10 text-zinc-300 hover:bg-white/15 hover:text-white"
        }
      `}
      aria-label={isListening ? "Stop listening" : "Start listening"}
    >
      {/* Pulse rings when active */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          <span className="absolute -inset-2 rounded-full border-2 border-red-500/20 animate-pulse" />
        </>
      )}

      {/* Microphone icon */}
      <svg
        className="relative w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
        />
      </svg>
    </button>
  );
}
