"use client";

import { useCallback, useRef, useState } from "react";
import OrderPanel from "@/components/OrderPanel";
import ConversationPanel, {
  type ConversationStatus,
  type Message,
} from "@/components/ConversationPanel";
import MicButton from "@/components/MicButton";
import { type Cart, createCart } from "@/lib/cart";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export default function Home() {
  const [cart, setCart] = useState<Cart>(createCart());
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [isListening, setIsListening] = useState(false);

  // Full conversation history sent to the API (includes tool calls etc.)
  const historyRef = useRef<ChatCompletionMessageParam[]>([]);
  const cartRef = useRef<Cart>(createCart());

  const sendMessage = useCallback(async (text: string) => {
    // Add user message to display
    const userDisplayMsg: Message = { role: "user", content: text };
    setDisplayMessages((prev) => [...prev, userDisplayMsg]);

    // Add to API history
    const userApiMsg: ChatCompletionMessageParam = {
      role: "user",
      content: text,
    };
    historyRef.current = [...historyRef.current, userApiMsg];

    setStatus("processing");
    setStreamingText("");

    try {
      const response = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyRef.current,
          cart: cartRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullAssistantText = "";

      setStatus("speaking");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (newline-delimited JSON)
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let event;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          switch (event.type) {
            case "text":
              fullAssistantText += event.content;
              setStreamingText(fullAssistantText);
              break;

            case "cart_update":
              // Instant cart update — the key sync mechanism
              cartRef.current = event.cart;
              setCart(event.cart);
              break;

            case "done":
              // Finalize conversation state
              historyRef.current = event.messages;
              cartRef.current = event.cart;
              setCart(event.cart);

              if (fullAssistantText) {
                setDisplayMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: fullAssistantText },
                ]);
              }
              setStreamingText("");
              break;

            case "error":
              console.error("Server error:", event.message);
              setDisplayMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content:
                    "Sorry, something went wrong. Please try again.",
                },
              ]);
              break;
          }
        }
      }
    } catch (error) {
      console.error("Request failed:", error);
      setDisplayMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please check your setup and try again.",
        },
      ]);
    }

    setStreamingText("");
    setStatus("idle");
  }, []);

  const handleTranscript = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage(text.trim());
      }
    },
    [sendMessage]
  );

  const handleListeningChange = useCallback((listening: boolean) => {
    setIsListening(listening);
    if (listening) {
      setStatus("listening");
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Koi Kitchen
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Voice-powered ordering
          </p>
        </div>
        {cart.items.length > 0 && (
          <div className="text-sm text-zinc-400">
            {cart.items.reduce((sum, i) => sum + i.quantity, 0)} items
          </div>
        )}
      </header>

      {/* Main split-screen content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Order panel */}
        <div className="w-[380px] flex-shrink-0 border-r border-white/5 bg-zinc-900/50">
          <OrderPanel cart={cart} />
        </div>

        {/* Right: Conversation panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <ConversationPanel
              messages={displayMessages}
              streamingText={streamingText}
              status={status}
            />
          </div>
        </div>
      </div>

      {/* Bottom: Mic button bar */}
      <div className="border-t border-white/5 bg-zinc-900/80 backdrop-blur">
        <div className="flex items-center justify-center py-4 gap-4">
          <MicButton
            onTranscript={handleTranscript}
            disabled={status === "processing" || status === "speaking"}
            isListening={isListening}
            onListeningChange={handleListeningChange}
          />
          {isListening && (
            <span className="text-red-400 text-sm animate-pulse">
              Listening...
            </span>
          )}
          {status === "processing" && (
            <span className="text-amber-400 text-sm">Processing...</span>
          )}
        </div>
      </div>
    </div>
  );
}
