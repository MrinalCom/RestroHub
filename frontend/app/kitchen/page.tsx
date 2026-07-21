"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/AuthContext";
import OrderCard, { KanbanOrder } from "./components/OrderCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const COLUMNS: { status: string; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

export default function KitchenPage() {
  const router = useRouter();
  const { user, token, ready, loggingOut } = useAuth();
  const [orders, setOrders] = useState<Record<string, KanbanOrder>>({});

  useEffect(() => {
    if (ready && !loggingOut && (!user || (user.role !== "staff" && user.role !== "owner"))) {
      router.push("/login");
    }
  }, [ready, user, loggingOut, router]);

  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(API_URL);
    socket.emit("kitchen:join");

    socket.on("order:new", (evt: KanbanOrder) => {
      setOrders((prev) => ({ ...prev, [evt.orderId]: { ...evt, status: "pending" } }));
    });
    socket.on("order:status", (evt: { orderId: string; status: string }) => {
      setOrders((prev) => ({
        ...prev,
        [evt.orderId]: { ...prev[evt.orderId], ...evt },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  async function advance(orderId: string, nextStatus: string) {
    if (!token) return router.push("/login");
    await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
  }

  const list = Object.values(orders);
  const activeCount = useMemo(
    () => list.filter((o) => o.status !== "completed").length,
    [list]
  );

  if (!ready || !user || (user.role !== "staff" && user.role !== "owner")) {
    return null;
  }

  return (
    <>
      <div className="page-head">
        <h1>Kitchen display</h1>
        <p>Live order board — updates in real time as orders come in.</p>
      </div>

      <div className="container">
        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{list.length}</div>
            <div className="stat-label">Total today</div>
          </div>
        </div>

        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const columnOrders = list.filter((o) => o.status === col.status);
            return (
              <div key={col.status} className="kanban-column">
                <div className="kanban-column-head">
                  <span>{col.label}</span>
                  <span className="kanban-count">{columnOrders.length}</span>
                </div>
                <div className="kanban-column-body">
                  <AnimatePresence>
                    {columnOrders.length === 0 && (
                      <p className="kanban-empty">No orders</p>
                    )}
                    {columnOrders.map((order) => (
                      <OrderCard key={order.orderId} order={order} onAdvance={advance} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
