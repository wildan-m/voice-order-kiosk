"use client";

import { type Cart } from "@/lib/cart";

interface OrderPanelProps {
  cart: Cart;
}

export default function OrderPanel({ cart }: OrderPanelProps) {
  const hasItems = cart.items.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white tracking-tight">
          Your Order
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {!hasItems && (
          <div className="text-center py-16">
            <div className="text-zinc-500 text-sm">
              Start speaking to add items
            </div>
          </div>
        )}

        {cart.items.map((item, index) => (
          <div
            key={`${item.name}-${item.notes}-${index}`}
            className="bg-white/5 rounded-xl p-4 border border-white/5
                       animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm truncate">
                    {item.name}
                  </span>
                  <span className="text-zinc-500 text-xs flex-shrink-0">
                    x{item.quantity}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-zinc-500 text-xs mt-1 truncate">
                    {item.notes}
                  </p>
                )}
              </div>
              <span className="text-white text-sm font-mono ml-4 flex-shrink-0">
                ${(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasItems && (
        <div className="border-t border-white/10 px-6 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Subtotal</span>
            <span className="text-zinc-300 font-mono">
              ${cart.subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Tax (8.875%)</span>
            <span className="text-zinc-300 font-mono">
              ${cart.tax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-white/10">
            <span className="text-white">Total</span>
            <span className="text-white font-mono">
              ${cart.total.toFixed(2)}
            </span>
          </div>

          {cart.confirmed && (
            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-center">
              <span className="text-emerald-400 text-sm font-medium">
                Order Confirmed
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
