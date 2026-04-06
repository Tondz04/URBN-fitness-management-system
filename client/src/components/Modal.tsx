import * as React from "react";
import { useTheme } from "../contexts/ThemeContext";

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number | string;
  footer?: React.ReactNode;
}

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 760,
  footer,
}: ModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const bgPrimary = isDark ? "#0a0a0a" : "#ffffff";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
          background: bgPrimary,
          border: `1px solid ${borderColor}`,
          borderRadius: "16px",
          boxShadow:
            "0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.2)",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              padding: "24px 24px 20px",
              borderBottom: `1px solid ${borderColor}`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  color: textPrimary,
                  fontWeight: 700,
                  fontSize: "20px",
                }}
              >
                {title}
              </div>
              <button
                aria-label="Close"
                onClick={onClose}
                style={{
                  background: "transparent",
                  color: textSecondary,
                  border: 0,
                  borderRadius: "6px",
                  padding: "8px",
                  cursor: "pointer",
                  fontSize: "20px",
                  lineHeight: 1,
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = bgSecondary;
                  e.currentTarget.style.color = textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = textSecondary;
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: "20px 24px",
              borderTop: `1px solid ${borderColor}`,
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
