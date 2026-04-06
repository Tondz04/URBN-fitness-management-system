import * as React from "react";
import { useTheme } from "../contexts/ThemeContext";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: "danger" | "primary";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonStyle = "danger",
}: ConfirmationModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const bgPrimary = isDark ? "#0a0a0a" : "#ffffff";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

  React.useEffect(() => {
    if (isOpen) {
      // Trap focus within modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
        // Prevent tabbing outside modal
        if (e.key === "Tab") {
          const modal = document.querySelector(
            '[role="dialog"]'
          ) as HTMLElement;
          if (modal) {
            const focusableElements = modal.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[
              focusableElements.length - 1
            ] as HTMLElement;

            if (e.shiftKey && document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const confirmButtonBg =
    confirmButtonStyle === "danger"
      ? "#ef4444"
      : isDark
      ? "#3b82f6"
      : "#2563eb";
  const confirmButtonHover =
    confirmButtonStyle === "danger"
      ? "#dc2626"
      : isDark
      ? "#2563eb"
      : "#1d4ed8";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease-out",
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
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          background: bgPrimary,
          borderRadius: "16px",
          border: `1px solid ${borderColor}`,
          boxShadow:
            "0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.2)",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 16px",
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <h2
            id="confirmation-title"
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 700,
              color: textPrimary,
            }}
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <div
          id="confirmation-message"
          style={{
            padding: "20px 24px",
            color: textSecondary,
            fontSize: "16px",
            lineHeight: "1.6",
          }}
        >
          {message}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px 24px",
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: bgSecondary,
              color: textPrimary,
              border: `1px solid ${borderColor}`,
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? "#2a2a2a" : "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = bgSecondary;
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              background: confirmButtonBg,
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = confirmButtonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = confirmButtonBg;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}
