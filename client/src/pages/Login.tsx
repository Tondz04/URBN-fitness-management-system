import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

// Component to check if setup is needed and show link
function SetupLink() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accentColor = isDark ? "#ffffff" : "#3b82f6";

  const [showSetup, setShowSetup] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    // Check if setup is needed by trying the setup endpoint
    fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "CHECK",
        email: "check@check.com",
        password: "check123456",
        role: "main_admin",
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        // If it says "already completed", don't show link
        // If it's a validation error or works, show link
        if (res.status === 403 && data.message?.includes("already completed")) {
          setShowSetup(false);
        } else {
          // Setup endpoint is available (validation error means it exists)
          setShowSetup(true);
        }
      })
      .catch(() => {
        setShowSetup(false);
      })
      .finally(() => {
        setChecking(false);
      });
  }, []);

  if (checking || !showSetup) return null;

  return (
    <p
      style={{
        color: accentColor,
        fontSize: 14,
        margin: "16px 0 0 0",
      }}
    >
      <a
        href="/register"
        style={{
          color: accentColor,
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        First time setup? Create admin account
      </a>
    </p>
  );
}

export default function Login() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgPrimary = isDark ? "#0a0a0a" : "#ffffff";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const accentColor = isDark ? "#ffffff" : "#3b82f6";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await login(email, password);

      if (success) {
        navigate("/");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: bgSecondary,
          borderRadius: 16,
          padding: "40px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.1)",
          border: `1px solid ${borderColor}`,
          width: "100%",
          maxWidth: 400,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <img
            src="/logo.png"
            alt="RNL Gym Management"
            style={{
              maxWidth: "280px",
              height: "auto",
              objectFit: "contain",
              filter: isDark
                ? "none"
                : "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)) brightness(1.05)",
              padding: isDark ? "0" : "12px",
              borderRadius: isDark ? "0" : "8px",
              backgroundColor: isDark
                ? "transparent"
                : "rgba(255, 255, 255, 0.6)",
              border: isDark ? "none" : "1px solid rgba(0, 0, 0, 0.05)",
            }}
            onError={(e) => {
              // Fallback if logo doesn't exist
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                const isDark =
                  document.documentElement.getAttribute("data-theme") ===
                  "dark";
                parent.innerHTML = `
                  <div style="
                    background: ${isDark ? "#1a1a1a" : "#f59e0b"};
                    color: ${isDark ? "#ffffff" : "#000"};
                    padding: 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 18px;
                    text-align: center;
                  ">
                    RNL GYM
                  </div>
                `;
              }
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              color: textPrimary,
              fontSize: 32,
              fontWeight: 800,
              margin: 0,
              marginBottom: 8,
            }}
          >
            Welcome Back
          </h1>
          <p
            style={{
              color: textSecondary,
              fontSize: 18,
              margin: 0,
            }}
          >
            Sign in to access the management system
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                color: textPrimary,
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                background: isDark ? "#1a1a1a" : "#ffffff",
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                color: textPrimary,
                fontSize: 16,
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = accentColor;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                color: textPrimary,
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                background: isDark ? "#1a1a1a" : "#ffffff",
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                color: textPrimary,
                fontSize: 16,
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = accentColor;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: isDark ? "#7f1d1d" : "#fef2f2",
                border: "1px solid #ef4444",
                borderRadius: 8,
                padding: "14px 16px",
                marginBottom: 20,
                color: isDark ? "#fca5a5" : "#dc2626",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "16px 20px",
              background: isLoading
                ? isDark
                  ? "#374151"
                  : "#f3f4f6"
                : isDark
                ? "#ffffff"
                : "#3b82f6",
              color: isLoading ? textSecondary : isDark ? "#111827" : "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = isDark
                  ? "#e5e5e5"
                  : "#2563eb";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = isDark
                  ? "#ffffff"
                  : "#3b82f6";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {isLoading ? (
              <>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: `2px solid ${textSecondary}`,
                    borderTop: "2px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            paddingTop: 24,
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          <p
            style={{
              color: textSecondary,
              fontSize: 14,
              margin: 0,
            }}
          >
            RNL Gym Management System
          </p>
          <p
            style={{
              color: textSecondary,
              fontSize: 12,
              margin: "8px 0 0 0",
            }}
          >
            Authorized personnel only
          </p>
          {/* Only show setup link if no admins exist - check via API */}
          <SetupLink />
        </div>
      </div>

      {/* Loading Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
