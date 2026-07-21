"use client";

import { motion, AnimatePresence } from "framer-motion";
import DishImage from "./DishImage";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number | string;
  category?: string;
}

interface Props {
  items: MenuItem[];
  recommendedIds?: Set<string>;
  onOrder?: (itemId: string) => void;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const card = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function MenuGrid({ items, recommendedIds, onOrder }: Props) {
  if (items.length === 0) {
    return <div className="empty-state">No dishes match this filter yet.</div>;
  }

  return (
    <motion.div className="grid" variants={container} initial="hidden" animate="show">
      {items.map((item) => {
        const isRecommended = recommendedIds?.has(item.id);
        return (
          <motion.div
            key={item.id}
            layout
            variants={card}
            className={`card ${isRecommended ? "recommended" : ""}`}
            whileHover={{ y: -4, boxShadow: "0 16px 34px rgba(20, 22, 28, 0.12)" }}
            transition={{ layout: { duration: 0.3 } }}
          >
            <div className="dish-image-wrap">
              <DishImage name={item.name} category={item.category} />
              <AnimatePresence>
                {isRecommended && (
                  <motion.span
                    key="badge"
                    className="badge badge-overlay"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    ✨ Matches your mood
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="card-body">
              <h3>{item.name}</h3>
              <p className="desc">{item.description}</p>
              <div className="card-top">
                <span className="price-pill">${Number(item.price).toFixed(2)}</span>
                {onOrder && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onOrder(item.id)}
                  >
                    Add
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
