"use client";

import { motion } from "framer-motion";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Hero() {
  return (
    <div className="hero" id="home">
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
        Bold spices. Honest cooking.
        <br />
        Every single plate.
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
