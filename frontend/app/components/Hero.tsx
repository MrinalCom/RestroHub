"use client";

import { motion } from "framer-motion";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function Hexagon({ style, size = 60 }: { style: React.CSSProperties; size?: number }) {
  const h = size * 1.1547;
  return (
    <svg width={size} height={h} viewBox="0 0 100 115" style={style}>
      <polygon points="50,0 100,29 100,86 50,115 0,86 0,29" strokeWidth="1.5" />
    </svg>
  );
}

export default function Hero() {
  return (
    <div className="hero" id="home">
      <div className="hero-hexagons" aria-hidden="true">
        <Hexagon style={{ top: 20, left: "6%", opacity: 0.7 }} size={44} />
        <Hexagon style={{ top: 60, left: "18%", opacity: 0.45 }} size={30} />
        <Hexagon style={{ top: 10, left: "34%", opacity: 0.5 }} size={26} />
        <Hexagon style={{ top: 90, right: "8%", opacity: 0.55 }} size={40} />
        <Hexagon style={{ top: 140, right: "22%", opacity: 0.4 }} size={28} />
        <Hexagon style={{ top: 40, right: "36%", opacity: 0.35 }} size={22} />
      </div>

      <motion.span
        className="eyebrow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Est. 2012 · Authentic Indian Kitchen
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        Bold spices, honest cooking,
        <br />
        <em>plated at kitchen speed.</em>
      </motion.h1>
      <motion.p
        className="lede"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        From Hyderabadi biryani to Punjabi curries, RestroHub brings recipes passed down through
        generations to your table — cooked fresh, served fast, and matched to exactly what
        you&rsquo;re craving.
      </motion.p>
      <motion.div
        className="hero-actions"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <button className="btn-primary" onClick={() => scrollTo("menu")}>
          View menu
        </button>
        <button className="btn-ghost" onClick={() => scrollTo("about")}>
          Our story
        </button>
      </motion.div>
    </div>
  );
}
