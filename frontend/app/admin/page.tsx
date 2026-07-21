"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../lib/AuthContext";
import RevenueChart from "./components/RevenueChart";
import StatusBreakdown from "./components/StatusBreakdown";
import TopDishesChart from "./components/TopDishesChart";
import ConversionFunnel from "./components/ConversionFunnel";
import MenuFormModal, { MenuItemFull } from "./components/MenuFormModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface MenuItemRow {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  stock_quantity: number;
  comfort: number;
  spicy: number;
  light: number;
  sweet: number;
  energizing: number;
}

interface DashboardStats {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    activeOrders: number;
  };
  revenueTimeseries: { day: string; revenue: number }[];
  topDishes: { id: string; name: string; orderCount: number }[];
  statusBreakdown: { status: string; count: number }[];
  moodConversion: { totalRecommendations: number; converted: number; conversionRate: number };
}

export default function AdminPage() {
  const router = useRouter();
  const { user, token, ready, loggingOut, logout } = useAuth();
  const [menu, setMenu] = useState<MenuItemRow[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; item?: MenuItemFull } | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !loggingOut && (!user || user.role !== "owner")) {
      router.push("/login");
    }
  }, [ready, user, loggingOut, router]);

  const loadMenu = useCallback(() => {
    fetch(`${API_URL}/api/menu`)
      .then((r) => r.json())
      .then(setMenu);
  }, []);

  const loadStats = useCallback(() => {
    if (!token) return;
    fetch(`${API_URL}/api/stats/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadMenu();
    loadStats();

    const socket: Socket = io(API_URL);
    socket.emit("admin:join");
    socket.on("stats:dirty", loadStats);

    return () => {
      socket.disconnect();
    };
  }, [token, loadMenu, loadStats]);

  async function toggleAvailability(item: MenuItemRow) {
    if (!token) return router.push("/login");
    await fetch(`${API_URL}/api/menu/${item.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isAvailable: !item.is_available }),
    });
    loadMenu();
  }

  async function deleteItem(item: MenuItemRow) {
    if (!token) return router.push("/login");
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;

    const res = await fetch(`${API_URL}/api/menu/${item.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 409) {
      const data = await res.json();
      setDeleteError(data.error);
      return;
    }
    setDeleteError(null);
    loadMenu();
  }

  if (!ready || !user || user.role !== "owner") {
    return null;
  }

  const tiles = stats
    ? [
        { label: "Total revenue", value: `$${stats.overview.totalRevenue.toFixed(2)}` },
        { label: "Total orders", value: stats.overview.totalOrders },
        { label: "Avg order value", value: `$${stats.overview.avgOrderValue.toFixed(2)}` },
        { label: "Active orders", value: stats.overview.activeOrders },
      ]
    : [];

  return (
    <>
      <div className="page-head">
        <div className="page-head-row">
          <div>
            <h1>Owner dashboard</h1>
            <p>Live stats, menu management, and the AI recommendation funnel.</p>
          </div>
          <button className="btn-ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">
        <div className="stat-row">
          {tiles.map((s, i) => (
            <motion.div
              key={s.label}
              className="stat-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {stats && (
          <div className="charts-grid">
            <RevenueChart data={stats.revenueTimeseries} />
            <StatusBreakdown data={stats.statusBreakdown} />
            <TopDishesChart data={stats.topDishes} />
            <ConversionFunnel data={stats.moodConversion} />
          </div>
        )}

        <div className="section-head" style={{ marginTop: "2.5rem" }}>
          <h2 style={{ fontSize: "1.3rem" }}>Menu management</h2>
          <button className="btn-primary" onClick={() => setModal({ mode: "create" })}>
            + Add dish
          </button>
        </div>

        {deleteError && <p className="auth-error">{deleteError}</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dish</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {menu.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>${Number(item.price).toFixed(2)}</td>
                  <td>{item.stock_quantity}</td>
                  <td>
                    <span className={`pill ${item.is_available ? "available" : "unavailable"}`}>
                      {item.is_available ? "Available" : "86'd"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="table-action" onClick={() => toggleAvailability(item)}>
                        {item.is_available ? "Mark 86'd" : "Mark available"}
                      </button>
                      <button
                        className="table-action"
                        onClick={() =>
                          setModal({
                            mode: "edit",
                            item: {
                              id: item.id,
                              name: item.name,
                              description: item.description,
                              price: item.price,
                              category: item.category,
                              stock_quantity: item.stock_quantity,
                              profile: {
                                comfort: item.comfort,
                                spicy: item.spicy,
                                light: item.light,
                                sweet: item.sweet,
                                energizing: item.energizing,
                              },
                            },
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="table-action table-action-danger"
                        onClick={() => deleteItem(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && token && (
        <MenuFormModal
          mode={modal.mode}
          initial={modal.item}
          token={token}
          onClose={() => setModal(null)}
          onSaved={loadMenu}
        />
      )}
    </>
  );
}
