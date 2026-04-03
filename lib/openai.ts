import OpenAI from "openai";
import { formatMenuForLLM } from "./menu";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are a friendly, efficient order-taker at an Asian fusion restaurant called "Koi Kitchen". You help customers place their orders through natural conversation.

Here is the full menu:
${formatMenuForLLM()}

Guidelines:
- Be warm but concise. Don't repeat the entire menu unless asked.
- When a customer orders something, use the add_item function immediately.
- If they want to remove or change quantities, use modify_item or remove_item.
- Suggest popular items or pairings naturally (e.g., "The ramen pairs great with gyoza!").
- If an item is not on the menu, politely let them know and suggest similar options.
- If the customer's request is ambiguous about which menu item, ask for clarification.
- When the customer says they're done or wants to check out, confirm the order summary and use confirm_order.
- Always use the exact menu item names when calling functions.
- For modifications/notes, include them in the notes parameter of add_item.
- Keep responses short — 1-2 sentences when possible. This is a fast-paced ordering experience.`;

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_item",
      description:
        "Add an item to the customer's order. Use the exact menu item name.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The exact name of the menu item to add",
          },
          quantity: {
            type: "number",
            description: "How many of this item to add (default 1)",
          },
          notes: {
            type: "string",
            description:
              "Special modifications or notes for this item (e.g., 'extra spicy', 'no peanuts')",
          },
        },
        required: ["name", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_item",
      description: "Remove an item entirely from the customer's order.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the menu item to remove",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "modify_item",
      description:
        "Change the quantity of an item already in the order. Use 0 to remove it.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the menu item to modify",
          },
          quantity: {
            type: "number",
            description: "The new quantity for this item",
          },
        },
        required: ["name", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirm_order",
      description:
        "Confirm and finalize the customer's order. Call this when they say they're done ordering.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

export interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onFunctionCall: (name: string, args: Record<string, unknown>) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function streamConversation(
  messages: ChatCompletionMessageParam[],
  callbacks: StreamCallbacks
): Promise<ChatCompletionMessageParam[]> {
  const fullMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  const newMessages: ChatCompletionMessageParam[] = [];

  try {
    const client = getClient();
    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      messages: fullMessages,
      tools,
      stream: true,
    });

    let currentToolCalls: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();
    let textContent = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // Handle streaming text content
      if (delta.content) {
        textContent += delta.content;
        callbacks.onTextDelta(delta.content);
      }

      // Handle tool calls that arrive in streaming chunks
      if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const idx = toolCall.index;

          if (!currentToolCalls.has(idx)) {
            currentToolCalls.set(idx, {
              id: toolCall.id || "",
              name: toolCall.function?.name || "",
              arguments: "",
            });
          }

          const existing = currentToolCalls.get(idx)!;

          if (toolCall.id) {
            existing.id = toolCall.id;
          }
          if (toolCall.function?.name) {
            existing.name = toolCall.function.name;
          }
          if (toolCall.function?.arguments) {
            existing.arguments += toolCall.function.arguments;
          }
        }
      }

      // Detect finish reason to process completed tool calls
      const finishReason = chunk.choices[0]?.finish_reason;

      if (finishReason === "tool_calls") {
        // All tool calls are complete — process them
        const toolCallsArray = Array.from(currentToolCalls.entries())
          .sort(([a], [b]) => a - b)
          .map(([, tc]) => tc);

        // Build the assistant message with tool_calls
        const assistantMessage: ChatCompletionMessageParam = {
          role: "assistant",
          content: textContent || null,
          tool_calls: toolCallsArray.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          })),
        };
        newMessages.push(assistantMessage);

        // Process each function call and emit to frontend
        for (const tc of toolCallsArray) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.arguments);
          } catch {
            args = {};
          }

          callbacks.onFunctionCall(tc.name, args);

          // Add tool result message so the model can continue
          const toolResultMessage: ChatCompletionMessageParam = {
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ success: true, action: tc.name, ...args }),
          };
          newMessages.push(toolResultMessage);
        }

        // After processing tool calls, make a follow-up call for the model
        // to generate a natural language response about what it just did
        const followUpMessages = [
          ...fullMessages,
          ...newMessages,
        ];

        const followUp = await client.chat.completions.create({
          model: "gpt-4o",
          messages: followUpMessages,
          tools,
          stream: true,
        });

        let followUpText = "";
        let followUpToolCalls: Map<
          number,
          { id: string; name: string; arguments: string }
        > = new Map();

        for await (const fChunk of followUp) {
          const fDelta = fChunk.choices[0]?.delta;
          if (!fDelta) continue;

          if (fDelta.content) {
            followUpText += fDelta.content;
            callbacks.onTextDelta(fDelta.content);
          }

          if (fDelta.tool_calls) {
            for (const toolCall of fDelta.tool_calls) {
              const idx = toolCall.index;
              if (!followUpToolCalls.has(idx)) {
                followUpToolCalls.set(idx, {
                  id: toolCall.id || "",
                  name: toolCall.function?.name || "",
                  arguments: "",
                });
              }
              const existing = followUpToolCalls.get(idx)!;
              if (toolCall.id) existing.id = toolCall.id;
              if (toolCall.function?.name) existing.name = toolCall.function.name;
              if (toolCall.function?.arguments) existing.arguments += toolCall.function.arguments;
            }
          }

          const fFinish = fChunk.choices[0]?.finish_reason;
          if (fFinish === "tool_calls") {
            // Process additional tool calls from follow-up
            const followUpTCArray = Array.from(followUpToolCalls.entries())
              .sort(([a], [b]) => a - b)
              .map(([, tc]) => tc);

            const followUpAssistant: ChatCompletionMessageParam = {
              role: "assistant",
              content: followUpText || null,
              tool_calls: followUpTCArray.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            };
            newMessages.push(followUpAssistant);

            for (const tc of followUpTCArray) {
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(tc.arguments); } catch { args = {}; }
              callbacks.onFunctionCall(tc.name, args);
              newMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify({ success: true, action: tc.name, ...args }),
              });
            }
          }
        }

        if (followUpText) {
          // If there were no additional tool calls, add the text as assistant message
          if (followUpToolCalls.size === 0) {
            newMessages.push({
              role: "assistant",
              content: followUpText,
            });
          }
        }
      } else if (finishReason === "stop") {
        // Normal text completion, no tool calls
        if (textContent) {
          newMessages.push({
            role: "assistant",
            content: textContent,
          });
        }
      }
    }

    callbacks.onComplete();
  } catch (error) {
    callbacks.onError(
      error instanceof Error ? error : new Error(String(error))
    );
  }

  return newMessages;
}
