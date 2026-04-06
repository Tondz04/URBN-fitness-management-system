import * as React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { GlobalRFIDScanner } from "./GlobalRFIDScanner";

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";
  // Use black tones for dark mode instead of blue
  // Light mode: Main content is pure white, sidebar is darker gray for contrast
  const bgPrimary = isDark ? "#0a0a0a" : "#ffffff"; // Very dark black / Pure white
  const bgSecondary = isDark ? "#000000" : "#e5e7eb"; // Pure black / Darker gray for sidebar contrast
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db"; // Dark gray border / Darker border for visibility
  const accentColor = isDark ? "#ffffff" : "#3b82f6"; // White accent instead of blue

  // Ensure sidebar doesn't close unexpectedly - only on mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sidebarOpen]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: bgPrimary,
        color: textPrimary,
      }}
    >
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: "fixed",
          top: 16,
          left: sidebarOpen ? 256 : 16,
          zIndex: 1001,
          background: bgSecondary,
          border: `1px solid ${borderColor}`,
          color: textPrimary,
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

      {/* Sidebar - Fixed position to prevent cutoff when scrolling */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 0,
          minWidth: sidebarOpen ? 240 : 0,
          background: bgSecondary,
          color: textPrimary,
          padding: sidebarOpen ? "16px" : 0,
          overflow: sidebarOpen ? "auto" : "hidden",
          transition: "width 0.3s ease, padding 0.3s ease",
          borderRight: sidebarOpen ? `1px solid ${borderColor}` : "none",
          display: sidebarOpen ? "flex" : "none",
          flexDirection: "column",
          height: "100vh",
          boxSizing: "border-box",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 1000,
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
              filter: isDark
                ? "none"
                : "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08)) brightness(1.03)",
              padding: isDark ? "0" : "6px",
              borderRadius: isDark ? "0" : "6px",
              backgroundColor: isDark
                ? "transparent"
                : "rgba(255, 255, 255, 0.4)",
              border: isDark ? "none" : "1px solid rgba(0, 0, 0, 0.05)",
            }}
          />
        </div>
        <nav
          style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}
        >
          <NavItem to="/" label="Dashboard" />
          <NavItem to="/transactions" label="Transactions" />
          <NavItem to="/products" label="Inventory" />
          <NavItem to="/clients" label="Customers" />
          <NavItem to="/tracking" label="Tracking" />
          {(user?.role === "main_admin" || user?.role === "staff") && (
            <NavItem to="/trash" label="Trash Bin" />
          )}
          {user?.role === "main_admin" && (
            <NavItem to="/register" label="Create Account" />
          )}
        </nav>

        {/* Theme Toggle Button - In sidebar */}
        <div
          style={{
            paddingTop: 12,
            paddingBottom: 8,
            borderTop: `1px solid ${borderColor}`,
            marginTop: "auto",
            flexShrink: 0,
          }}
        >
          <button
            onClick={toggleTheme}
            style={{
              width: "100%",
              background: bgPrimary,
              border: `1px solid ${borderColor}`,
              color: textPrimary,
              borderRadius: 8,
              padding: "12px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#1a1a1a" : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = bgPrimary;
            }}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span style={{ fontSize: 18 }}>{isDark ? "☀️" : "🌙"}</span>
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        {/* User Info and Logout */}
        <div
          style={{
            paddingTop: 12,
            paddingBottom: 12,
            borderTop: `1px solid ${borderColor}`,
            marginTop: "auto",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              color: textSecondary,
              fontSize: 14,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Logged in as:
          </div>
          <div
            style={{
              color: accentColor,
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 8,
              textAlign: "center",
              wordBreak: "break-all",
            }}
          >
            {user?.name || user?.email}
          </div>
          {user?.role && typeof user.role === "string" && (
            <div
              style={{
                color: textSecondary,
                fontSize: 12,
                marginBottom: 12,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              {user.role.replace("_", " ")}
            </div>
          )}
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "transparent",
              border: "1px solid #ef4444",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              marginBottom: 12,
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
          background: bgPrimary,
          color: textPrimary,
          marginLeft: sidebarOpen ? 240 : 0,
          transition: "margin-left 0.3s ease",
          fontSize: "18px", // Increased font size
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
      
      {/* Global RFID Scanner - Always active across all pages */}
      <GlobalRFIDScanner />
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgPrimary = isDark ? "#111827" : "#ffffff";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const accentColor = isDark ? "#60a5fa" : "#3b82f6";

  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: "12px 16px",
        borderRadius: 8,
        color: isActive ? bgPrimary : textPrimary,
        textDecoration: "none",
        background: isActive ? accentColor : "transparent",
        border: isActive ? `1px solid ${accentColor}` : "1px solid transparent",
        fontSize: "16px",
        fontWeight: isActive ? 600 : 500,
        transition: "all 0.2s ease",
      })}
    >
      {label}
    </NavLink>
  );
}
