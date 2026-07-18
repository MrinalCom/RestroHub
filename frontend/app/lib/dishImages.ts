// Curated per-dish photo URLs. Each was individually fetched and visually verified
// (not just keyword-matched) before being added here — keyword-based image search
// (tried first, via LoremFlickr) returned wrong or duplicate-fallback photos for
// ~30% of dishes, which is why this is a hand-picked map rather than a generated one.
// Source: Unsplash (free stock photography) for all except Rasmalai/Kheer, where no
// good Unsplash match existed — those two use Wikimedia Commons instead.
const DISH_IMAGES: Record<string, string> = {
  Samosa: "https://images.unsplash.com/photo-1772729996007-40bad08b3c40?w=480&h=360&fit=crop&q=80",
  "Paneer Tikka": "https://images.unsplash.com/photo-1781332143834-19a40f746cd9?w=480&h=360&fit=crop&q=80",
  "Chicken 65": "https://images.unsplash.com/photo-1727280376746-b89107a5b0df?w=480&h=360&fit=crop&q=80",
  "Aloo Tikki": "https://images.unsplash.com/photo-1559847844-b0915a3800c6?w=480&h=360&fit=crop&q=80",
  "Butter Chicken": "https://images.unsplash.com/photo-1772730065344-4cf131b39951?w=480&h=360&fit=crop&q=80",
  "Paneer Butter Masala": "https://images.unsplash.com/photo-1683533738338-19b9a22c6405?w=480&h=360&fit=crop&q=80",
  "Dal Makhani": "https://images.unsplash.com/photo-1755090154817-58d9d36ec988?w=480&h=360&fit=crop&q=80",
  "Palak Paneer": "https://images.unsplash.com/photo-1767114915936-745dd372f1d8?w=480&h=360&fit=crop&q=80",
  "Rogan Josh": "https://images.unsplash.com/photo-1742599361586-385011e91305?w=480&h=360&fit=crop&q=80",
  "Chole Masala": "https://images.unsplash.com/photo-1654199903998-e49181b41a95?w=480&h=360&fit=crop&q=80",
  "Hyderabadi Chicken Biryani": "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=480&h=360&fit=crop&q=80",
  "Vegetable Biryani": "https://images.unsplash.com/photo-1684409642850-b48e5ab8e67c?w=480&h=360&fit=crop&q=80",
  "Jeera Rice": "https://images.unsplash.com/photo-1704916029542-da6fa7bc34e7?w=480&h=360&fit=crop&q=80",
  "Garlic Naan": "https://images.unsplash.com/photo-1756821752957-00bfcadc3748?w=480&h=360&fit=crop&q=80",
  "Butter Naan": "https://images.unsplash.com/photo-1756821753151-0879e7862e50?w=480&h=360&fit=crop&q=80",
  "Tandoori Roti": "https://images.unsplash.com/photo-1708782343717-be4ea260249a?w=480&h=360&fit=crop&q=80",
  "Lachha Paratha": "https://images.unsplash.com/photo-1763951719000-661d3d50d763?w=480&h=360&fit=crop&q=80",
  "Gulab Jamun": "https://images.unsplash.com/photo-1593701461250-d7b22dfd3a77?w=480&h=360&fit=crop&q=80",
  Rasmalai: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Ras_Malai_2.JPG/500px-Ras_Malai_2.JPG",
  Kheer: "https://upload.wikimedia.org/wikipedia/commons/4/46/Kheer.jpg",
  "Mango Lassi": "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=480&h=360&fit=crop&q=80",
  "Masala Chai": "https://images.unsplash.com/photo-1633069683078-b180ba2afd89?w=480&h=360&fit=crop&q=80",
  "Nimbu Pani": "https://images.unsplash.com/photo-1676159434854-2f7f860a18cd?w=480&h=360&fit=crop&q=80",
  Thandai: "https://images.unsplash.com/photo-1616884950055-861aeb5eb380?w=480&h=360&fit=crop&q=80",
};

export function getDishImageUrl(name: string): string | null {
  return DISH_IMAGES[name] ?? null;
}
