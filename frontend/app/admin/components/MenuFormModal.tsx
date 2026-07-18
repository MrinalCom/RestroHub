"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const CATEGORIES = ["starters", "mains", "biryani", "breads", "desserts", "beverages"];

const PROFILE_DIMENSIONS = ["comfort", "spicy", "light", "sweet", "energizing"] as const;
type ProfileDimension = (typeof PROFILE_DIMENSIONS)[number];

export interface MenuItemFull {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
  profile?: Record<ProfileDimension, number>;
}

interface Props {
  mode: "create" | "edit";
  token: string;
  initial?: MenuItemFull;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_PROFILE: Record<ProfileDimension, number> = {
  comfort: 0.5,
  spicy: 0.2,
  light: 0.5,
  sweet: 0.2,
  energizing: 0.3,
};

export default function MenuFormModal({ mode, token, initial, onClose, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [stockQuantity, setStockQuantity] = useState(initial?.stock_quantity?.toString() ?? "20");
  const [profile, setProfile] = useState<Record<ProfileDimension, number>>(
    initial?.profile ?? DEFAULT_PROFILE
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const body = {
      name,
      description,
      price: Number(price),
      category,
      stockQuantity: Number(stockQuantity),
      profile,
    };

    try {
      const url =
        mode === "create" ? `${API_URL}/api/menu` : `${API_URL}/api/menu/${initial!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.formErrors?.[0] ?? data.error ?? "Save failed");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">{mode === "create" ? "Add dish" : "Edit dish"}</h3>

        <form onSubmit={submit} className="auth-form">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Price ($)
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Stock quantity
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
            />
          </label>

          <div className="profile-sliders">
            <span className="profile-sliders-label">
              Craving profile — feeds the mood recommender
            </span>
            {PROFILE_DIMENSIONS.map((dim) => (
              <div key={dim} className="slider-row">
                <span className="slider-label">{dim}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={profile[dim]}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, [dim]: Number(e.target.value) }))
                  }
                />
                <span className="slider-value">{profile[dim].toFixed(2)}</span>
              </div>
            ))}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Add dish" : "Save changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
