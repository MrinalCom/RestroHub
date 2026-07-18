"use client";

import Link from "next/link";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="footer" id="contact">
      <div className="footer-inner">
        <div className="footer-col">
          <div className="brand" style={{ marginBottom: "0.75rem" }}>
            <span className="brand-mark">R</span>
            RestroHub
          </div>
          <p className="footer-blurb">
            Authentic Indian cuisine, cooked the way it&rsquo;s meant to be — bold spices, slow
            recipes, and a kitchen that never cuts corners.
          </p>
          <div className="social-row">
            <a href="#" aria-label="Instagram">📷</a>
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="Twitter">🐦</a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Quick links</h4>
          <Link href="/#home">Home</Link>
          <Link href="/#menu">Menu</Link>
          <Link href="/#about">About</Link>
          <Link href="/login">Login</Link>
        </div>

        <div className="footer-col">
          <h4>Contact</h4>
          <p>📍 42 Spice Lane, Bengaluru</p>
          <p>📞 +91 98765 43210</p>
          <p>✉️ hello@restrohub.com</p>
          <p>🕒 11:00 AM – 11:00 PM, daily</p>
        </div>

        <div className="footer-col">
          <h4>Stay updated</h4>
          <p className="footer-blurb">New dishes, seasonal specials, and offers.</p>
          {subscribed ? (
            <p style={{ color: "var(--gold-bright)" }}>Thanks — you&rsquo;re on the list.</p>
          ) : (
            <form
              className="newsletter"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSubscribed(true);
              }}
            >
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">Subscribe</button>
            </form>
          )}
        </div>
      </div>

      <div className="footer-bottom">© {new Date().getFullYear()} RestroHub. All rights reserved.</div>
    </footer>
  );
}
