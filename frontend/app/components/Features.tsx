"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "🌿",
    title: "Fresh, authentic ingredients",
    desc: "Spices ground in-house, produce sourced daily — nothing frozen, nothing pre-mixed.",
  },
  {
    icon: "🚀",
    title: "Fast kitchen-to-table",
    desc: "Real-time order tracking from the moment your ticket hits the kitchen to when it's ready.",
  },
  {
    icon: "✨",
    title: "AI-powered mood matching",
    desc: "Tell us how you're feeling and our recommendation engine finds the dish that actually fits.",
  },
  {
    icon: "👨‍🍳",
    title: "Recipes, not shortcuts",
    desc: "Every gravy and marinade follows a recipe passed down through generations of home cooks.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Features() {
  return (
    <section className="container">
      <div className="section-head" style={{ border: "none", paddingBottom: 0 }}>
        <h2>Why RestroHub</h2>
      </div>
      <motion.div
        className="features-grid"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {FEATURES.map((f) => (
          <motion.div key={f.title} className="feature-card" variants={item}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
