"use client";

import { motion } from "framer-motion";

export interface KanbanOrder {
  orderId: string;
  total?: number;
  status: string;
  items?: { name: string; quantity: number }[];
}

const NEXT_STATUS: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "completed",
};

const NEXT_LABEL: Record<string, string> = {
  pending: "Start preparing →",
  preparing: "Mark ready →",
  ready: "Mark completed →",
};

interface Props {
  order: KanbanOrder;
  onAdvance: (orderId: string, nextStatus: string) => void;
}

export default function OrderCard({ order, onAdvance }: Props) {
  const next = NEXT_STATUS[order.status];

  return (
    <motion.div
      layout
      layoutId={order.orderId}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className="kanban-card"
    >
      <div className="kanban-card-head">
        <span className="kanban-order-id">#{order.orderId.slice(0, 8)}</span>
        <span className="price-pill">${order.total?.toFixed(2) ?? "—"}</span>
      </div>

      {order.items && order.items.length > 0 && (
        <ul className="kanban-items">
          {order.items.map((item, i) => (
            <li key={i}>
              <span className="kanban-item-qty">{item.quantity}×</span> {item.name}
            </li>
          ))}
        </ul>
      )}

      {next ? (
        <button className="kanban-advance" onClick={() => onAdvance(order.orderId, next)}>
          {NEXT_LABEL[order.status]}
        </button>
      ) : (
        <span className="pill status-completed kanban-done-badge">Done</span>
      )}
    </motion.div>
  );
}
