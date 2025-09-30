import * as React from "react";

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
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          margin: 16,
          background: "#0b0f1a",
          border: "1px solid #1f2937",
          borderRadius: 12,
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.03) inset, 0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #1f2937" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ color: "#e5e7eb", fontWeight: 800, fontSize: 18 }}>
              {title}
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              style={{
                background: "transparent",
                color: "#9ca3af",
                border: 0,
                borderRadius: 6,
                padding: 6,
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: 16 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: 16,
              borderTop: "1px solid #1f2937",
              textAlign: "right",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
