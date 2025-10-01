import * as React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { userEmail, logout } = useAuth();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#332b10" }}>
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: "fixed",
          top: 16,
          left: sidebarOpen ? 256 : 16,
          zIndex: 1001,
          background: "#1f2937",
          border: "1px solid #374151",
          color: "#ffffff",
          borderRadius: 8,
          padding: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          transition: "left 0.3s ease",
        }}
        title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
      >
        {/* Hamburger Menu Icon */}
        <div
          style={{
            width: 20,
            height: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: "100%",
              height: 2,
              background: "#ffffff",
              borderRadius: 1,
              transition: "transform 0.3s ease",
              transform: sidebarOpen
                ? "rotate(45deg) translate(5px, 5px)"
                : "none",
            }}
          />
          <div
            style={{
              width: "100%",
              height: 2,
              background: "#ffffff",
              borderRadius: 1,
              transition: "opacity 0.3s ease",
              opacity: sidebarOpen ? 0 : 1,
            }}
          />
          <div
            style={{
              width: "100%",
              height: 2,
              background: "#ffffff",
              borderRadius: 1,
              transition: "transform 0.3s ease",
              transform: sidebarOpen
                ? "rotate(-45deg) translate(7px, -6px)"
                : "none",
            }}
          />
        </div>
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 0,
          background: "#000000",
          color: "#ffffff",
          padding: sidebarOpen ? "16px 16px 16px 16px" : 0,
          overflow: "hidden",
          transition: "width 0.3s ease",
          borderRight: "1px solid #1f2937",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <img
            src="/urban.jpg"
            alt="URBN FITNESS GYM"
            style={{
              maxWidth: "100%",
              height: "auto",
              maxHeight: 60,
              objectFit: "contain",
            }}
          />
        </div>
        <nav
          style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}
        >
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/transactions" label="Transactions" />
          <NavItem to="/products" label="Products" />
          <NavItem to="/clients" label="Clients" />
          <NavItem to="/tracking" label="Tracking" />
        </nav>

        {/* User Info and Logout */}
        <div
          style={{
            paddingTop: 12,
            paddingBottom: 8,
            borderTop: "1px solid #1f2937",
            marginTop: "auto",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              color: "#9ca3af",
              fontSize: 12,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Logged in as:
          </div>
          <div
            style={{
              color: "#f59e0b",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              textAlign: "center",
              wordBreak: "break-all",
            }}
          >
            {userEmail}
          </div>
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "transparent",
              border: "1px solid #ef4444",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#ef4444";
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main
        style={{
          flex: 1,
          padding: 24,
          background: "#332b10",
          color: "#ffffff",
          marginLeft: sidebarOpen ? 0 : 0,
          transition: "margin-left 0.3s ease",
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
