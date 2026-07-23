"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../lib/CartContext";
import { useAuth } from "../lib/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function CartDrawer() {
  const cart = useCart();
  const { token, ready } = useAuth();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    if (!ready) return;
    if (!token) {
      cart.close();
      router.push("/login");
      return;
    }

    setPlacing(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ menuItemId: i.id, quantity: i.quantity })),
          ...(cart.lastRecommendationLogId
            ? { recommendationLogId: cart.lastRecommendationLogId }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not place order");

      cart.clear();
      cart.close();
      router.push(`/orders/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <>
          <motion.div
            className="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cart.close}
          />
          <motion.div
            className="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
          >
            <div className="cart-header">
              <span className="cart-header-title">Your order</span>
              <button className="cart-close" onClick={cart.close} aria-label="Close cart">
                ✕
              </button>
            </div>

            <div className="cart-lines">
              {cart.items.length === 0 ? (
                <p className="review-summary">Your cart is empty — add a dish from the menu.</p>
              ) : (
                cart.items.map((item) => (
                  <div className="cart-line" key={item.id}>
                    <div className="cart-line-info">
                      <span className="cart-line-name">{item.name}</span>
                      <span className="cart-line-price">${Number(item.price).toFixed(2)} each</span>
                    </div>
                    <div className="cart-line-qty">
                      <button onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <button className="cart-line-remove" onClick={() => cart.removeItem(item.id)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="cart-footer">
                {error && <p className="auth-error">{error}</p>}
                <div className="cart-subtotal">
                  <span>Subtotal</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                <button className="btn-primary" onClick={checkout} disabled={placing}>
                  {placing ? "Placing order…" : token ? "Checkout" : "Log in to checkout"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
