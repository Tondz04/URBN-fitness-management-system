import * as React from "react";
import { useTheme } from "./ThemeContext";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // Auto-dismiss duration in ms (default: 4000)
}

interface NotificationContextType {
  showNotification: (
    type: NotificationType,
    message: string,
    duration?: number
  ) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const NotificationContext = React.createContext<
  NotificationContextType | undefined
>(undefined);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const removeNotification = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = React.useCallback(
    (type: NotificationType, message: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const notification: Notification = { id, type, message, duration };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const showSuccess = React.useCallback(
    (message: string, duration?: number) => {
      showNotification("success", message, duration);
    },
    [showNotification]
  );

  const showError = React.useCallback(
    (message: string, duration?: number) => {
      showNotification("error", message, duration);
    },
    [showNotification]
  );

  const showWarning = React.useCallback(
    (message: string, duration?: number) => {
      showNotification("warning", message, duration);
    },
    [showNotification]
  );

  const showInfo = React.useCallback(
    (message: string, duration?: number) => {
      showNotification("info", message, duration);
    },
    [showNotification]
  );

  // Theme colors
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

  const getNotificationStyles = (type: NotificationType) => {
    const baseStyles = {
      background: bgSecondary,
      border: `1px solid ${borderColor}`,
      borderRadius: "12px",
      padding: "16px 20px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      minWidth: "300px",
      maxWidth: "500px",
      animation: "slideInRight 0.3s ease-out",
    };

    switch (type) {
      case "success":
        return {
          ...baseStyles,
          borderLeft: "4px solid #10b981",
          background: isDark ? "#1a1a1a" : "#f0fdf4",
        };
      case "error":
        return {
          ...baseStyles,
          borderLeft: "4px solid #ef4444",
          background: isDark ? "#1a1a1a" : "#fef2f2",
        };
      case "warning":
        return {
          ...baseStyles,
          borderLeft: "4px solid #f59e0b",
          background: isDark ? "#1a1a1a" : "#fffbeb",
        };
      case "info":
        return {
          ...baseStyles,
          borderLeft: "4px solid #3b82f6",
          background: isDark ? "#1a1a1a" : "#eff6ff",
        };
      default:
        return baseStyles;
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✖";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "";
    }
  };

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "#10b981";
      case "error":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      default:
        return textPrimary;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          pointerEvents: "none",
        }}
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              ...getNotificationStyles(notification.type),
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: getIconColor(notification.type),
                flexShrink: 0,
              }}
            >
              {getIcon(notification.type)}
            </div>
            <div
              style={{
                flex: 1,
                color: textPrimary,
                fontSize: "15px",
                fontWeight: 500,
                lineHeight: "1.4",
              }}
            >
              {notification.message}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              style={{
                background: "transparent",
                border: "none",
                color: textSecondary,
                cursor: "pointer",
                fontSize: "18px",
                padding: "0",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = React.useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}
