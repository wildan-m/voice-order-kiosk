"use client";

import { useEffect, useRef } from "react";

export type ConversationStatus = "idle" | "listening" | "processing" | "speaking";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationPanelProps {
  messages: Message[];
  streamingText: string;
  status: ConversationStatus;
}

function StatusIndicator({ status }: { status: ConversationStatus }) {
  const labels: Record<ConversationStatus, string> = {
    idle: "Ready",
    listening: "Listening",
    processing: "Thinking",
    speaking: "Responding",
  };

  const colors: Record<ConversationStatus, string> = {
    idle: "bg-zinc-500",
    listening: "bg-red-500",
    processing: "bg-amber-500",
    speaking: "bg-emerald-500",
  };

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10">
      <span className="relative flex h-2 w-2">
        {status !== "idle" && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[status]}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${colors[status]}`}
        />
      </span>
      <span className="text-xs text-zinc-400 uppercase tracking-wider">
        {labels[status]}
      </span>
    </div>
  );
}

export default function ConversationPanel({
  messages,
  streamingText,
  status,
}: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  return (
    <div className="flex flex-col h-full">
      <StatusIndicator status={status} />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {messages.length === 0 && !streamingText && (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">
              Tap the microphone and say your order
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-white/5 text-zinc-200 border border-white/5 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed bg-white/5 text-zinc-200 border border-white/5">
              {streamingText}
              <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-0.5 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}

        {status === "processing" && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/5 border border-white/5">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
