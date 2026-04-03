import { NextRequest } from "next/server";
import { streamConversation } from "@/lib/openai";
import { findMenuItem } from "@/lib/menu";
import {
  createCart,
  addItem,
  removeItem,
  modifyItem,
  confirmOrder,
  type Cart,
} from "@/lib/cart";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * Streaming conversation endpoint.
 *
 * Receives: { messages: ChatCompletionMessageParam[], cart: Cart }
 * Streams back: newline-delimited JSON events
 *   - { type: "text", content: string }         — incremental text tokens
 *   - { type: "cart_update", cart: Cart, action: {...} }  — structured cart mutation
 *   - { type: "done", messages: [...], cart: Cart }       — final state
 *   - { type: "error", message: string }         — error info
 *
 * The dual-channel approach (text + cart_update) is the core of the real-time
 * sync: the frontend can update the order display the instant a function call
 * is detected, without waiting for the full LLM response to finish.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const messages: ChatCompletionMessageParam[] = body.messages || [];
  let cart: Cart = body.cart || createCart();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      const newMessages = await streamConversation(messages, {
        onTextDelta(text) {
          send({ type: "text", content: text });
        },

        onFunctionCall(name, args) {
          switch (name) {
            case "add_item": {
              const menuItem = findMenuItem(args.name as string);
              if (menuItem) {
                cart = addItem(
                  cart,
                  menuItem.name,
                  (args.quantity as number) || 1,
                  menuItem.price,
                  (args.notes as string) || ""
                );
              }
              send({
                type: "cart_update",
                cart,
                action: { name: "add_item", ...args },
              });
              break;
            }
            case "remove_item": {
              cart = removeItem(cart, args.name as string);
              send({
                type: "cart_update",
                cart,
                action: { name: "remove_item", ...args },
              });
              break;
            }
            case "modify_item": {
              cart = modifyItem(
                cart,
                args.name as string,
                args.quantity as number
              );
              send({
                type: "cart_update",
                cart,
                action: { name: "modify_item", ...args },
              });
              break;
            }
            case "confirm_order": {
              cart = confirmOrder(cart);
              send({
                type: "cart_update",
                cart,
                action: { name: "confirm_order" },
              });
              break;
            }
          }
        },

        onComplete() {
          send({
            type: "done",
            messages: [...messages, ...newMessages],
            cart,
          });
          controller.close();
        },

        onError(error) {
          send({ type: "error", message: error.message });
          controller.close();
        },
      });

      // newMessages is captured via closure after streamConversation resolves
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
