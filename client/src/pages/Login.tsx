import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
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
    }

    setIsLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#000000",
          borderRadius: 16,
          padding: "40px",
          boxShadow:
            "0 0 30px rgba(245, 158, 11, 0.3), 0 20px 40px rgba(0,0,0,0.8)",
          border: "2px solid #f59e0b",
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
            }}
            onError={(e) => {
              // Fallback if logo doesn't exist
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div style="
                    background: #f59e0b;
                    color: #000;
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
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 800,
              margin: 0,
              marginBottom: 8,
            }}
          >
            Welcome Back
          </h1>
          <p
            style={{
              color: "#9ca3af",
              fontSize: 16,
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
                color: "#e5e7eb",
                fontSize: 14,
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
                padding: "12px 16px",
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: 8,
                color: "#ffffff",
                fontSize: 16,
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#f59e0b";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#374151";
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                color: "#e5e7eb",
                fontSize: 14,
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
                padding: "12px 16px",
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: 8,
                color: "#ffffff",
                fontSize: 16,
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#f59e0b";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#374151";
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "#1f2937",
                border: "1px solid #ef4444",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
                color: "#ef4444",
                fontSize: 14,
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
              padding: "14px 16px",
              background: isLoading ? "#374151" : "#f59e0b",
              color: isLoading ? "#9ca3af" : "#000000",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
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
                e.currentTarget.style.background = "#d97706";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "#f59e0b";
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
                    border: "2px solid #9ca3af",
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
            borderTop: "1px solid #1f2937",
          }}
        >
          <p
            style={{
              color: "#6b7280",
              fontSize: 12,
              margin: 0,
            }}
          >
            RNL Gym Management System
          </p>
          <p
            style={{
              color: "#6b7280",
              fontSize: 12,
              margin: "4px 0 0 0",
            }}
          >
            Authorized personnel only
          </p>
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
