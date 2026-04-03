# Voice Order Kiosk

A voice-interactive restaurant ordering system. Customers speak their order naturally, an LLM processes it in real-time using structured function calls, and the order display updates instantly as items are added, removed, or modified.

## How the real-time sync works

The core technical challenge is streaming conversational text from the LLM **while simultaneously** extracting structured cart operations and applying them to the UI — without waiting for the full response to complete.

### Dual-channel streaming architecture

```
 Browser (Web Speech API)
    |
    | transcribed text
    v
 Next.js API Route (/api/conversation)
    |
    | messages + cart state
    v
 OpenAI GPT-4o (streaming + function calling)
    |
    |  The model streams two kinds of output simultaneously:
    |  1. Natural language text tokens
    |  2. Function call invocations (add_item, remove_item, etc.)
    |
    v
 Stream processor (server-side)
    |
    | newline-delimited JSON (NDJSON)
    | Each line is one of:
    |   { type: "text",        content: "Sure, I'll add..." }
    |   { type: "cart_update", cart: {...}, action: {...} }
    |   { type: "done",        messages: [...], cart: {...} }
    |
    v
 Frontend stream reader
    |
    +---> "text" events     --> ConversationPanel (streaming text display)
    |
    +---> "cart_update" events --> OrderPanel (instant cart mutation)
```

When the LLM decides to add an item, OpenAI emits a `tool_calls` chunk in the stream. The server detects this **immediately**, applies the cart operation, and sends the updated cart as a `cart_update` event — all while the text stream may still be in progress. The frontend reads the NDJSON stream line-by-line and dispatches each event to the appropriate UI component.

This means the order panel updates the **instant** the LLM commits to a cart action, not after the entire response finishes.

### Function calling schema

The LLM has four cart operations available:

| Function | Parameters | Description |
|---|---|---|
| `add_item` | `name`, `quantity`, `notes` | Add a menu item to the order |
| `remove_item` | `name` | Remove an item entirely |
| `modify_item` | `name`, `quantity` | Change quantity of an existing item |
| `confirm_order` | — | Finalize the order |

These are defined as OpenAI function calling tools. The model invokes them based on natural conversation — "I'll have two ramen" triggers `add_item("Tonkotsu Ramen", 2)`.

## Architecture

```
voice-order-kiosk/
├── app/
│   ├── layout.tsx              Root layout
│   ├── page.tsx                Split-screen UI (order + conversation + mic)
│   ├── globals.css             Tailwind + custom animations
│   └── api/
│       ├── conversation/
│       │   └── route.ts        Streaming conversation endpoint (NDJSON)
│       └── menu/
│           └── route.ts        Menu data endpoint
├── components/
│   ├── OrderPanel.tsx          Live order display with animated updates
│   ├── ConversationPanel.tsx   Chat transcript with streaming text
│   └── MicButton.tsx           Push-to-talk with Web Speech API
├── lib/
│   ├── menu.ts                 Restaurant menu data and lookup
│   ├── openai.ts               OpenAI streaming client with function calling
│   └── cart.ts                 Cart state management and calculations
```

**Stack**: Next.js (App Router), TypeScript, Tailwind CSS, OpenAI GPT-4o, Web Speech API

## Setup

```bash
git clone https://github.com/wildan-m/voice-order-kiosk.git
cd voice-order-kiosk
npm install
cp .env.example .env
```

Add your OpenAI API key to `.env`:

```
OPENAI_API_KEY=sk-...
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge (required for Web Speech API support).

1. Click the microphone button
2. Speak your order naturally ("I'd like two tonkotsu ramen and a green tea")
3. Watch the order panel update in real-time as the LLM processes your request
4. The AI will confirm items and suggest additions
5. Say "that's all" or "I'm done" to confirm the order

## Technical notes

- **Speech recognition** uses the browser-native Web Speech API (SpeechRecognition). No external speech-to-text service required. Works in Chrome and Edge.
- **Streaming** uses NDJSON over a standard HTTP response with `ReadableStream`. No WebSocket server needed — the browser reads the response body incrementally using the Streams API.
- **Cart state** is maintained both server-side (for function call processing) and client-side (for instant UI updates). The `done` event reconciles both.
- **Tax calculation** uses 8.875% (NYC rate) applied to the subtotal.
- **Conversation history** is maintained per browser session in a ref. The full history (including tool call messages) is sent with each request so the LLM has context.
