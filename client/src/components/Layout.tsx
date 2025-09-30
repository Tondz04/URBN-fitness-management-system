import * as React from "react";
import { NavLink } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b0f1a" }}>
      <aside
        style={{
          width: 240,
          background: "#000000",
          color: "#ffffff",
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 24 }}>
          URB Fitness Gym
        </div>
        <nav style={{ display: "grid", gap: 8 }}>
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/transactions" label="Transactions" />
          <NavItem to="/products" label="Products" />
          <NavItem to="/users" label="Users" />
        </nav>
      </aside>
      <main
        style={{
          flex: 1,
          padding: 24,
          background: "#0b0f1a",
          color: "#ffffff",
        }}
      >
        {children}
      </main>
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: "10px 12px",
        borderRadius: 8,
        color: isActive ? "#111827" : "#ffffff",
        textDecoration: "none",
        background: isActive ? "#f59e0b" : "transparent",
        border: isActive ? "1px solid #f59e0b" : "1px solid transparent",
      })}
    >
      {label}
    </NavLink>
  );
}
