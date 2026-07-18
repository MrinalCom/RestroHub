"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onRecommend: (mood: string) => Promise<void>;
}

const QUICK_MOODS = [
  { label: "😩 Stressed", value: "stressed and need comfort food" },
  { label: "🥵 Hot day", value: "hot out, want something light and refreshing" },
  { label: "🎉 Celebrating", value: "celebrating something, want a treat" },
  { label: "😴 Need energy", value: "tired and need an energy boost" },
  { label: "🌶️ Craving heat", value: "in the mood for something spicy" },
];

export default function MoodPicker({ onRecommend }: Props) {
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function submit(text?: string) {
    const value = (text ?? mood).trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      await onRecommend(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.div
        className="mood-box"
        animate={{
          boxShadow: focused
            ? "0 10px 30px rgba(203, 160, 80, 0.22)"
            : "0 2px 10px rgba(0, 0, 0, 0.35)",
          borderColor: focused ? "#cba050" : "rgba(203, 160, 80, 0.18)",
        }}
        transition={{ duration: 0.25 }}
      >
        <textarea
          rows={2}
          placeholder="How are you feeling today? e.g. 'stressed, need comfort food'"
          value={mood}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setMood(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <motion.button
          onClick={() => submit()}
          disabled={loading || !mood.trim()}
          whileHover={!loading ? { scale: 1.04 } : undefined}
          whileTap={!loading ? { scale: 0.96 } : undefined}
        >
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.span
                key="loading"
                className="btn-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.span
                  className="spinner"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                />
                Thinking…
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Suggest dishes
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      <div className="chip-row">
        {QUICK_MOODS.map((q) => (
          <motion.button
            key={q.label}
            className="chip"
            whileHover={{ scale: 1.05, backgroundColor: "rgba(203, 160, 80, 0.12)", borderColor: "#cba050" }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setMood(q.value);
              submit(q.value);
            }}
          >
            {q.label}
          </motion.button>
        ))}
      </div>
    </>
  );
}
