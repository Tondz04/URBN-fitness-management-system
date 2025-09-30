import * as React from "react";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Status } from "../components/Status";

export default function Transactions() {
  const [rows, setRows] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<string>("");
  const [users, setUsers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [membershipTypes, setMembershipTypes] = React.useState<any[]>([]);
  const [deletingTransaction, setDeletingTransaction] = React.useState<
    number | null
  >(null);

  // Form state
  const [formData, setFormData] = React.useState({
    user_id: "",
    transaction_type: "membership",
    membership_type: "student",
    product_id: "",
    quantity: 1,
    payment_mode: "cash",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  React.useEffect(() => {
    fetchData();
    fetchUsers();
    fetchProducts();
    fetchMembershipTypes();
  }, [filterType, filterStatus]);

  const fetchData = async () => {
    try {
      let url = "/api/transactions";
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterStatus) params.append("status", filterStatus);
      if (params.toString()) url += "?" + params.toString();

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setRows(data.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch transactions:", err);
      setError(err.message || "Failed to load transactions");
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const fetchMembershipTypes = async () => {
    try {
      const response = await fetch("/api/membership-types");
      if (response.ok) {
        const data = await response.json();
        setMembershipTypes(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch membership types:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Submitting transaction data:", formData);

      // Build payload only with relevant fields by type
      const payload: any = {
        user_id: formData.user_id,
        transaction_type: formData.transaction_type,
        quantity: formData.quantity,
        payment_mode: formData.payment_mode,
        transaction_date: formData.transaction_date,
        notes: formData.notes,
      };

      if (formData.transaction_type === "membership") {
        payload.membership_type = formData.membership_type;
      }
      if (formData.transaction_type === "product") {
        payload.product_id = formData.product_id;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Failed to create transaction");
      }

      const successData = await response.json();
      console.log("Success response:", successData);

      // Reset form and refresh data
      setFormData({
        user_id: "",
        transaction_type: "membership",
        membership_type: "student",
        product_id: "",
        quantity: 1,
        payment_mode: "cash",
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowAddForm(false);
      fetchData();
      fetchUsers(); // Refresh users to update membership info
      alert("Transaction created successfully!");
    } catch (err: any) {
      console.error("Failed to create transaction:", err);
      alert("Failed to create transaction: " + err.message);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingTransaction(transactionId);
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete transaction");
      }

      fetchData();
      fetchUsers(); // Refresh users to update membership info
      alert("Transaction deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete transaction:", err);
      alert("Failed to delete transaction: " + err.message);
    } finally {
      setDeletingTransaction(null);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            Loading transactions...
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !rows) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 16 }}>
            Failed to load transactions
          </div>
          <div style={{ color: "#9ca3af", marginBottom: 20 }}>
            {error || "Unable to connect to the server"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#3b82f6",
              color: "white",
              border: 0,
              borderRadius: 8,
              padding: "12px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Transactions</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: "#10b981",
            color: "white",
            border: 0,
            borderRadius: 8,
            padding: "12px 24px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showAddForm ? "Cancel" : "Add Transaction"}
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#1f2937",
          padding: 16,
          borderRadius: 12,
          border: "1px solid #1f2937",
          marginBottom: 16,
          display: "flex",
          gap: 16,
          alignItems: "center",
          color: "#ffffff",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              color: "#ffffff",
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              color: "white",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            <option value="">All Types</option>
            <option value="membership">Membership</option>
            <option value="product">Product</option>
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              color: "#ffffff",
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              background: "#1f2937",
              border: "1px solid #374151",
              color: "white",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <Modal
          title="Add New Transaction"
          onClose={() => setShowAddForm(false)}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                User
              </label>
              <select
                required
                value={formData.user_id}
                onChange={(e) => handleInputChange("user_id", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Transaction Type
              </label>
              <select
                required
                value={formData.transaction_type}
                onChange={(e) =>
                  handleInputChange("transaction_type", e.target.value)
                }
                style={{
                  width: "100%",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                <option value="membership">Membership</option>
                <option value="product">Product Purchase</option>
              </select>
            </div>

            {formData.transaction_type === "membership" && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: "#9ca3af",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Membership Type
                </label>
                <select
                  required
                  value={formData.membership_type}
                  onChange={(e) =>
                    handleInputChange("membership_type", e.target.value)
                  }
                  style={{
                    width: "100%",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: 6,
                  }}
                >
                  {Object.entries(membershipTypes).map(
                    ([key, type]: [string, any]) => (
                      <option key={key} value={key}>
                        {type.name} - ₱{type.price}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {formData.transaction_type === "product" && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: "#9ca3af",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Product
                </label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) =>
                    handleInputChange("product_id", e.target.value)
                  }
                  style={{
                    width: "100%",
                    background: "#1f2937",
                    border: "1px solid #374151",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: 6,
                  }}
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ₱{product.price}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) =>
                  handleInputChange("quantity", parseInt(e.target.value))
                }
                style={{
                  width: "100%",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Payment Mode
              </label>
              <select
                required
                value={formData.payment_mode}
                onChange={(e) =>
                  handleInputChange("payment_mode", e.target.value)
                }
                style={{
                  width: "100%",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Date
              </label>
              <input
                type="date"
                required
                value={formData.transaction_date}
                onChange={(e) =>
                  handleInputChange("transaction_date", e.target.value)
                }
                style={{
                  width: "100%",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                  minHeight: 80,
                }}
                placeholder="Optional notes about this transaction..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
              <button
                type="submit"
                style={{
                  background: "#10b981",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create Transaction
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transactions Table */}
      <div
        style={{
          background: "#0b0f1a",
          borderRadius: 12,
          border: "1px solid #1f2937",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr
              style={{
                color: "#9ca3af",
                textAlign: "left",
                background: "#111827",
              }}
            >
              <th style={{ padding: 16 }}>ID</th>
              <th style={{ padding: 16 }}>User</th>
              <th style={{ padding: 16 }}>Type</th>
              <th style={{ padding: 16 }}>Details</th>
              <th style={{ padding: 16 }}>Amount</th>
              <th style={{ padding: 16 }}>Date</th>
              <th style={{ padding: 16 }}>Status</th>
              <th style={{ padding: 16 }}>Payment</th>
              <th style={{ padding: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  {r.id}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.user?.name}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {r.user?.email}
                    </div>
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div
                    style={{
                      background:
                        r.transaction_type === "membership"
                          ? "#3b82f6"
                          : "#f59e0b",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {r.transaction_type}
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  {r.transaction_type === "membership" ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {r.membership?.type?.replace("_", " ")}
                      </div>
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>
                        {r.membership?.start_date &&
                          new Date(
                            r.membership.start_date
                          ).toLocaleDateString()}{" "}
                        -{" "}
                        {r.membership?.end_date &&
                          new Date(r.membership.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.product?.name}</div>
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>
                        Qty: {r.quantity}
                      </div>
                    </div>
                  )}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div style={{ fontWeight: 600 }}>₱{r.total_amount}</div>
                  {r.quantity > 1 && (
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      ₱{r.unit_price} each
                    </div>
                  )}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  {new Date(r.transaction_date).toLocaleDateString()}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <Status value={r.status} />
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div
                    style={{
                      background: "#1f2937",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  >
                    {r.payment_mode}
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <button
                    onClick={() => handleDeleteTransaction(r.id)}
                    disabled={deletingTransaction === r.id}
                    style={{
                      background:
                        deletingTransaction === r.id ? "#6b7280" : "#ef4444",
                      color: "white",
                      border: 0,
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor:
                        deletingTransaction === r.id
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {deletingTransaction === r.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
