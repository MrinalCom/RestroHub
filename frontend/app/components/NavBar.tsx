"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "../lib/AuthContext";

const MAIN_LINKS = [
  { href: "/#home", label: "Home" },
  { href: "/#menu", label: "Menu" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

const STAFF_LINKS = [
  { href: "/kitchen", label: "Kitchen" },
  { href: "/admin", label: "Owner" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">R</span>
          RestroHub
        </Link>

        <nav className="nav-links">
          {MAIN_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              <span className="nav-link-text">{link.label}</span>
            </Link>
          ))}
          <span className="nav-divider" />
          {STAFF_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className="nav-link">
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="nav-pill"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={active ? "nav-link-text active" : "nav-link-text"}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {ready && user ? (
          <div className="nav-user">
            <span className="nav-user-info">
              {user.name} <span className="nav-user-role">{user.role}</span>
            </span>
            <button className="nav-cta nav-logout" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <Link href="/login" className="nav-cta">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
