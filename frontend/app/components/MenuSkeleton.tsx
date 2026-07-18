export default function MenuSkeleton() {
  return (
    <div className="grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line" style={{ width: "60%", height: 16 }} />
          <div className="skeleton-line" style={{ width: "90%" }} />
          <div className="skeleton-line" style={{ width: "75%" }} />
          <div className="skeleton-line" style={{ width: "35%", marginTop: "0.5rem" }} />
        </div>
      ))}
    </div>
  );
}
