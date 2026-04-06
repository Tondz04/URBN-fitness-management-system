import * as React from "react";
import { Modal } from "../components/Modal";
import { useTheme } from "../contexts/ThemeContext";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmationModal } from "../components/ConfirmationModal";

export default function TrashBin() {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const isMainAdmin = user?.role === "main_admin";

  const [trashData, setTrashData] = React.useState<{
    products: any[];
    customers: any[];
    transactions: any[];
  }>({ products: [], customers: [], transactions: [] });
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState<
    "all" | "products" | "customers" | "transactions"
  >("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState<{
    isOpen: boolean;
    type: "product" | "customer" | "transaction";
    id: number | null;
  }>({ isOpen: false, type: "product", id: null });

  React.useEffect(() => {
    fetchTrash();
  }, [category, searchTerm]);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      if (!user?.email) {
        showError("Please log in to view deleted items");
        return;
      }
      const url = new URL("/api/trash", window.location.origin);
      if (category !== "all") url.searchParams.append("category", category);
      if (searchTerm) url.searchParams.append("search", searchTerm);

      const response = await fetch(url.toString(), {
        headers: {
          "X-User-Email": user.email,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch trash");
      }
      const data = await response.json();
      if (data.error) {
        showError(data.message || "Failed to load deleted items");
        return;
      }
      setTrashData(
        data.data || { products: [], customers: [], transactions: [] }
      );
    } catch (err: any) {
      showError(err.message || "Failed to load deleted items");
      console.error("Trash fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (
    type: "product" | "customer" | "transaction",
    id: number
  ) => {
    try {
      if (!user?.email) {
        showError("Please log in to restore items");
        return;
      }
      const endpoint =
        type === "product"
          ? "products"
          : type === "customer"
          ? "users"
          : "transactions";
      const response = await fetch(`/api/${endpoint}/${id}/restore`, {
        method: "POST",
        headers: {
          "X-User-Email": user.email,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to restore");
      }
      showSuccess(
        `${type.charAt(0).toUpperCase() + type.slice(1)} restored successfully!`
      );
      fetchTrash();
    } catch (err: any) {
      showError(err.message || "Failed to restore item");
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      if (!user?.email) {
        showError("Please log in to permanently delete items");
        return;
      }
      const endpoint =
        confirmDelete.type === "product"
          ? "products"
          : confirmDelete.type === "customer"
          ? "users"
          : "transactions";
      const response = await fetch(
        `/api/${endpoint}/${confirmDelete.id}/force`,
        {
          method: "DELETE",
          headers: {
            "X-User-Email": user.email,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to permanently delete");
      }
      showSuccess("Item permanently deleted");
      setConfirmDelete({ isOpen: false, type: "product", id: null });
      fetchTrash();
    } catch (err: any) {
      showError(err.message || "Failed to permanently delete item");
    }
  };

  const getDaysUntilPermanent = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const days = Math.ceil(
      (30 * 24 * 60 * 60 * 1000 - (Date.now() - deleted.getTime())) /
        (24 * 60 * 60 * 1000)
    );
    return Math.max(0, days);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: textSecondary }}>
          Loading deleted items...
        </div>
      </div>
    );
  }

  const allItems = [
    ...trashData.products.map((p) => ({ ...p, type: "product" as const })),
    ...trashData.customers.map((c) => ({ ...c, type: "customer" as const })),
    ...trashData.transactions.map((t) => ({
      ...t,
      type: "transaction" as const,
    })),
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>
          Recently Deleted
        </h2>
      </div>

      {/* Category Filter */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          background: bgSecondary,
          padding: 12,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
        }}
      >
        {(["all", "products", "customers", "transactions"] as const).map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                background:
                  category === cat
                    ? isDark
                      ? "#1a1a1a"
                      : "#ffffff"
                    : "transparent",
                color: textPrimary,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
                textTransform: "capitalize",
              }}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          )
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search deleted items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "12px 16px",
            background: isDark ? "#1a1a1a" : "#ffffff",
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            color: textPrimary,
            fontSize: 16,
          }}
        />
      </div>

      {/* Items List */}
      <div
        style={{
          background: bgSecondary,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          overflow: "hidden",
        }}
      >
        {allItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: textSecondary,
            }}
          >
            No deleted items found
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: isDark ? "#1a1a1a" : "#e5e7eb",
                  borderBottom: `2px solid ${borderColor}`,
                }}
              >
                <th
                  style={{
                    padding: 16,
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Deleted
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Days Left
                </th>
                <th
                  style={{
                    padding: 16,
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, index) => {
                const daysLeft = getDaysUntilPermanent(item.deleted_at);
                return (
                  <tr
                    key={`${item.type}-${item.id}`}
                    style={{
                      borderBottom: `1px solid ${borderColor}`,
                      background:
                        index % 2 === 0
                          ? bgSecondary
                          : isDark
                          ? "#0a0a0a"
                          : "#ffffff",
                    }}
                  >
                    <td
                      style={{
                        padding: 16,
                        color: textPrimary,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.type}
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: textPrimary,
                        fontWeight: 600,
                      }}
                    >
                      {item.name || item.user_name || `#${item.id}`}
                    </td>
                    <td style={{ padding: 16, color: textSecondary }}>
                      {new Date(item.deleted_at).toLocaleDateString()}
                    </td>
                    <td
                      style={{
                        padding: 16,
                        color: daysLeft <= 7 ? "#ef4444" : textSecondary,
                        fontWeight: daysLeft <= 7 ? 700 : 400,
                      }}
                    >
                      {daysLeft} days
                    </td>
                    <td style={{ padding: 16 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleRestore(item.type, item.id)}
                          style={{
                            background: "#057a1a",
                            color: "white",
                            border: 0,
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          Restore
                        </button>
                        {isMainAdmin && (
                          <button
                            onClick={() =>
                              setConfirmDelete({
                                isOpen: true,
                                type: item.type,
                                id: item.id,
                              })
                            }
                            style={{
                              background: "#8a0707",
                              color: "white",
                              border: 0,
                              borderRadius: 6,
                              padding: "6px 12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 14,
                            }}
                          >
                            Delete Forever
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        onClose={() =>
          setConfirmDelete({ isOpen: false, type: "product", id: null })
        }
        onConfirm={handlePermanentDelete}
        title="Permanently Delete Item"
        message="Are you sure you want to permanently delete this item? This action cannot be undone."
        confirmText="Delete Forever"
        cancelText="Cancel"
        confirmButtonStyle="danger"
      />
    </div>
  );
}
