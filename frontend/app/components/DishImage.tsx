"use client";

import { useState } from "react";
import { getDishImageUrl } from "../lib/dishImages";

const CATEGORY_ICON: Record<string, string> = {
  starters: "🥗",
  mains: "🍛",
  biryani: "🍚",
  breads: "🫓",
  desserts: "🍮",
  beverages: "🥤",
};

interface Props {
  name: string;
  category?: string;
}

export default function DishImage({ name, category }: Props) {
  const [failed, setFailed] = useState(false);
  const icon = category ? CATEGORY_ICON[category] ?? "🍽️" : "🍽️";
  const url = getDishImageUrl(name);

  if (failed || !url) {
    return (
      <div className="dish-image dish-image-fallback">
        <span>{icon}</span>
      </div>
    );
  }

  return (
    <div className="dish-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}
