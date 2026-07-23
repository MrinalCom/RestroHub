"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../lib/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STEPS = [
  { status: "pending", label: "Pending" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: string;
}

interface OrderDetail {
  id: string;
  status: string;
  total: string;
  items: OrderItem[];
}

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, ready } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${API_URL}/api/orders/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Order not found");
        return r.json();
      })
      .then(setOrder)
      .catch((err) => setError(err.message));
  }, [ready, token, params.id, router]);

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(API_URL);
    socket.emit("order:watch", params.id);
    socket.on("order:status", (evt: { orderId: string; status: string }) => {
      if (evt.orderId === params.id) {
        setOrder((prev) => (prev ? { ...prev, status: evt.status } : prev));
      }
    });

    return () => {
      socket.emit("order:unwatch", params.id);
      socket.disconnect();
    };
  }, [token, params.id]);

  if (error) {
    return (
      <div className="container">
        <div className="empty-state">{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container">
        <div className="empty-state">Loading your order…</div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.status === order.status);
  const cancelled = order.status === "cancelled";

  return (
    <div className="container">
      <div className="page-head" style={{ padding: 0, margin: "0 0 2rem" }}>
        <h1>Order #{order.id.slice(0, 8)}</h1>
        <p>We&rsquo;ll update this page live as your order moves through the kitchen.</p>
      </div>

      {cancelled ? (
        <span className="pill status-cancelled">Cancelled</span>
      ) : (
        <div className="order-steps">
          {STEPS.map((step, i) => (
            <div
              key={step.status}
              className={`order-step ${i <= stepIndex ? "done" : ""} ${i === stepIndex ? "active" : ""}`}
            >
              <span className="order-step-dot" />
              <span className="order-step-label">{step.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: "2rem" }}>
        <table>
          <thead>
            <tr>
              <th>Dish</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>${Number(item.unit_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cart-subtotal" style={{ marginTop: "1.25rem", maxWidth: 300 }}>
        <span>Total</span>
        <span>${Number(order.total).toFixed(2)}</span>
      </div>
    </div>
  );
}
