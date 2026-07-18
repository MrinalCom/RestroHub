"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "./components/Hero";
import About from "./components/About";
import Features from "./components/Features";
import MoodPicker from "./components/MoodPicker";
import MenuGrid from "./components/MenuGrid";
import MenuSkeleton from "./components/MenuSkeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface Recommendation {
  id: string;
  score: number;
}

export default function HomePage() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [recommended, setRecommended] = useState<Set<string>>(new Set());
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    fetch(`${API_URL}/api/menu`)
      .then((r) => r.json())
      .then(setMenu)
      .catch(() => setMenu([]));
  }, []);

  async function handleMood(mood: string) {
    const res = await fetch(`${API_URL}/api/recommend/mood`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const ids = new Set<string>(data.recommendations.map((r: Recommendation) => r.id));
    setRecommended(ids);
    setReasoning(data.cravingProfile?.reasoning ?? null);
    setCategory("all");
  }

  const categories = useMemo(() => {
    if (!menu) return [];
    return ["all", ...Array.from(new Set(menu.map((m) => m.category)))];
  }, [menu]);

  const filtered = useMemo(() => {
    if (!menu) return [];
    return category === "all" ? menu : menu.filter((m) => m.category === category);
  }, [menu, category]);

  return (
    <>
      <Hero />
      <About />
      <Features />

      <div className="container" id="menu">
        <div className="section-head">
          <div>
            <span className="eyebrow" style={{ margin: 0 }}>
              ✨ AI-powered mood matching
            </span>
            <h2 style={{ marginTop: "0.6rem" }}>Find your dish</h2>
          </div>
        </div>

        <MoodPicker onRecommend={handleMood} />

        <AnimatePresence>
          {reasoning && (
            <motion.p
              key={reasoning}
              className="reasoning"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {reasoning}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="section-head">
          <h2 style={{ fontSize: "1.3rem" }}>Today&rsquo;s menu</h2>
          {categories.length > 0 && (
            <div className="filter-row">
              {categories.map((c) => (
                <button
                  key={c}
                  className={`filter-pill ${category === c ? "active" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {menu === null ? (
          <MenuSkeleton />
        ) : (
          <MenuGrid items={filtered} recommendedIds={recommended} />
        )}
      </div>
    </>
  );
}
