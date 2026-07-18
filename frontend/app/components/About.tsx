"use client";

import { motion } from "framer-motion";

const STATS = [
  { value: "2012", label: "Founded" },
  { value: "40+", label: "Signature dishes" },
  { value: "15K+", label: "Happy diners" },
  { value: "4.8★", label: "Average rating" },
];

export default function About() {
  return (
    <section className="container about-section" id="about">
      <div className="about-grid">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
        >
          <span className="eyebrow" style={{ margin: 0 }}>
            Our story
          </span>
          <h2 style={{ marginTop: "0.75rem" }}>A kitchen built on family recipes</h2>
          <p className="about-copy">
            RestroHub started in a single rented kitchen with one goal: cook Indian food the way
            it&rsquo;s cooked at home — slow-simmered gravies, hand-ground spice blends, bread
            baked fresh in a real tandoor. More than a decade later, that hasn&rsquo;t changed.
          </p>
          <p className="about-copy">
            Every dish on our menu traces back to a family recipe, adjusted only by the number of
            plates we now serve — never by the amount of care that goes into each one.
          </p>
        </motion.div>

        <motion.div
          className="stat-row about-stats"
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
