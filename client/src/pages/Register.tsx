import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNotification } from "../contexts/NotificationContext";

export default function Register() {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const isDark = theme === "dark";
  const bgPrimary = isDark ? "#0a0a0a" : "#ffffff";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const accentColor = isDark ? "#ffffff" : "#3b82f6";

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [role, setRole] = React.useState<"main_admin" | "staff">("staff");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if this is first-time setup (no admins exist)
  // If user is not authenticated, it might be setup mode
  const [isSetup, setIsSetup] = React.useState(!user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      // Determine endpoint based on whether user is authenticated
      const endpoint = !user ? "/api/setup" : "/api/register";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Only add auth header if user is authenticated
      if (user?.email) {
        headers["X-User-Email"] = user.email;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          email,
          password,
          role: !user ? "main_admin" : role, // First setup always creates main_admin
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();
      showSuccess(data.message || "Account created successfully!");

      if (!user) {
        // After setup, redirect to login
        navigate("/login");
      } else {
        // After registration, go back or refresh
        navigate(-1);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated but not main admin, show unauthorized
  if (user && user.role !== "main_admin") {
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
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            border: `1px solid ${borderColor}`,
            width: "100%",
            maxWidth: 500,
            textAlign: "center",
          }}
        >
          <h1 style={{ color: textPrimary, fontSize: 24, marginBottom: 16 }}>
            Unauthorized
          </h1>
          <p style={{ color: textSecondary, fontSize: 16, marginBottom: 24 }}>
            Only Main Admin can create new accounts.
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              background: accentColor,
              color: isDark ? "#111827" : "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          border: `1px solid ${borderColor}`,
          width: "100%",
          maxWidth: 500,
        }}
      >
        <h1
          style={{
            color: textPrimary,
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {!user ? "Initial Setup" : "Create Account"}
        </h1>
        <p
          style={{
            color: textSecondary,
            fontSize: 18,
            margin: 0,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          {!user
            ? "Create the first admin account"
            : "Create a new staff account"}
        </p>

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
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
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
                boxSizing: "border-box",
              }}
            />
          </div>

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
              placeholder="Enter email address"
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
                boxSizing: "border-box",
              }}
            />
          </div>

          {user && (
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
                Role
              </label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "main_admin" | "staff")
                }
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option value="main_admin">Main Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          )}

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
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: isDark ? "#1a1a1a" : "#ffffff",
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                color: textPrimary,
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
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
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: isDark ? "#1a1a1a" : "#ffffff",
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                color: textPrimary,
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

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
              }}
            >
              {error}
            </div>
          )}

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
            }}
          >
            {isLoading
              ? "Creating..."
              : !user
              ? "Create Admin Account"
              : "Create Account"}
          </button>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => navigate(!user ? "/login" : "/")}
              style={{
                background: "transparent",
                border: "none",
                color: accentColor,
                fontSize: 16,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {!user ? "Back to Login" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
