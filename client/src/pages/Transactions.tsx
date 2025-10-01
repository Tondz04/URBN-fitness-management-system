import * as React from "react";
import { Modal } from "../components/Modal";
import { Status } from "../components/Status";

export default function Transactions() {
  const [rows, setRows] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<
    any | null
  >(null);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [receiptTransaction, setReceiptTransaction] = React.useState<
    any | null
  >(null);
  const [filterType, setFilterType] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<string>("");
  const [users, setUsers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [membershipTypes, setMembershipTypes] = React.useState<any[]>([]);
  const [deletingTransaction, setDeletingTransaction] = React.useState<
    number | null
  >(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filter transactions based on search term
  const filteredTransactions = React.useMemo(() => {
    if (!rows) return [];

    return rows.filter((transaction) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.user?.name?.toLowerCase().includes(searchLower) ||
        transaction.user?.email?.toLowerCase().includes(searchLower) ||
        transaction.product?.name?.toLowerCase().includes(searchLower) ||
        transaction.membership?.type?.toLowerCase().includes(searchLower) ||
        transaction.membership?.start_date
          ?.toLowerCase()
          .includes(searchLower) ||
        transaction.membership?.end_date?.toLowerCase().includes(searchLower) ||
        transaction.transaction_type?.toLowerCase().includes(searchLower) ||
        transaction.notes?.toLowerCase().includes(searchLower) ||
        transaction.total_amount?.toString().includes(searchLower) ||
        transaction.quantity?.toString().includes(searchLower) ||
        transaction.payment_mode?.toLowerCase().includes(searchLower) ||
        transaction.transaction_date?.toLowerCase().includes(searchLower)
      );
    });
  }, [rows, searchTerm]);

  // Form state
  const [formData, setFormData] = React.useState({
    user_id: "",
    transaction_type: "membership",
    membership_type: "student",
    product_id: "",
    quantity: 1,
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  React.useEffect(() => {
    fetchData();
    fetchUsers();
    fetchProducts();
    fetchMembershipTypes();
  }, [filterType, filterStatus]);

  // Populate form data when editing
  React.useEffect(() => {
    if (showEditForm && editingTransaction) {
      setFormData({
        user_id: editingTransaction.user_id?.toString() || "",
        transaction_type: editingTransaction.transaction_type || "membership",
        membership_type: editingTransaction.membership?.type || "student",
        product_id: editingTransaction.product_id?.toString() || "",
        quantity: editingTransaction.quantity || 1,
        transaction_date:
          editingTransaction.transaction_date ||
          new Date().toISOString().split("T")[0],
        notes: editingTransaction.notes || "",
      });
    }
  }, [showEditForm, editingTransaction]);

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
        payment_mode: "cash",
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
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowAddForm(false);
      fetchData();
      fetchUsers(); // Refresh users to update membership info
      fetchProducts(); // Refresh products to update stock levels
      alert("Transaction created successfully!");
    } catch (err: any) {
      console.error("Failed to create transaction:", err);
      alert("Failed to create transaction: " + err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      console.log("Updating transaction data:", formData);

      // Build payload only with relevant fields by type
      const payload: any = {
        user_id: formData.user_id,
        transaction_type: formData.transaction_type,
        quantity: formData.quantity,
        payment_mode: "cash",
        transaction_date: formData.transaction_date,
        notes: formData.notes,
      };

      if (formData.transaction_type === "membership") {
        payload.membership_type = formData.membership_type;
      }
      if (formData.transaction_type === "product") {
        payload.product_id = formData.product_id;
      }

      const response = await fetch(
        `/api/transactions/${editingTransaction.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update transaction");
      }

      // Reset form and refresh data
      setFormData({
        user_id: "",
        transaction_type: "membership",
        membership_type: "student",
        product_id: "",
        quantity: 1,
        transaction_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowEditForm(false);
      setEditingTransaction(null);
      fetchData();
      fetchUsers(); // Refresh users to update membership info
      fetchProducts(); // Refresh products to update stock levels
      alert("Transaction updated successfully!");
    } catch (err: any) {
      console.error("Failed to update transaction:", err);
      alert("Failed to update transaction: " + err.message);
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
      fetchProducts(); // Refresh products to update stock levels
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
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#9ca3af" }}>
          Loading transactions...
        </div>
      </div>
    );
  }

  if (error || !rows) {
    return (
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
            background: "#071d63",
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
    );
  }

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
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Transactions</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: "#057a1a",
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
          background: "#000000",
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
              background: "#1a1a1a",
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
              background: "#1a1a1a",
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
          maxWidth={700}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr 1fr" }}
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
                  maxWidth: "120px",
                  background: "#1a1a1a",
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
                  maxWidth: "120px",
                  background: "#1a1a1a",
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
                    background: "#1a1a1a",
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
                    background: "#1a1a1a",
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
                  maxWidth: "120px",
                  background: "#1a1a1a",
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
              <div
                style={{
                  width: "100%",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>💵</span>
                <span>Cash</span>
              </div>
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
                  maxWidth: "120px",
                  background: "#1a1a1a",
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
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "12px",
                  borderRadius: 8,
                  minHeight: 80,
                  fontSize: 14,
                  resize: "vertical",
                }}
                placeholder="Optional notes about this transaction..."
              />
            </div>

            <div style={{ gridColumn: "1 / -1", textAlign: "right" }}>
              <button
                type="submit"
                style={{
                  background: "#057a1a",
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

      {/* Edit Transaction Modal */}
      {showEditForm && editingTransaction && (
        <Modal
          title="Edit Transaction"
          onClose={() => {
            setShowEditForm(false);
            setEditingTransaction(null);
          }}
          maxWidth={600}
        >
          <div style={{ color: "white", padding: "20px" }}>
            <h3 style={{ marginBottom: "20px", color: "#e5e7eb" }}>
              Edit Transaction #{editingTransaction.id}
            </h3>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#9ca3af",
                }}
              >
                Client
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => handleInputChange("user_id", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  borderRadius: 6,
                }}
              >
                <option value="">Select Client</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#9ca3af",
                }}
              >
                Transaction Type
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) =>
                  handleInputChange("transaction_type", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  borderRadius: 6,
                }}
              >
                <option value="membership">Membership</option>
                <option value="product">Product</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#9ca3af",
                }}
              >
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  handleInputChange("quantity", parseInt(e.target.value))
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  borderRadius: 6,
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#9ca3af",
                }}
              >
                Date
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  handleInputChange("transaction_date", e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  borderRadius: 6,
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#9ca3af",
                }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  borderRadius: 6,
                  minHeight: "80px",
                }}
                placeholder="Optional transaction notes..."
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingTransaction(null);
                }}
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                style={{
                  background: "#057a1a",
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
              >
                Update Transaction
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Original Complex Edit Modal - Disabled */}
      {false && showEditForm && editingTransaction && (
        <Modal
          title="Edit Transaction"
          onClose={() => {
            setShowEditForm(false);
            setEditingTransaction(null);
          }}
          maxWidth={700}
        >
          <form
            onSubmit={handleEditSubmit}
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "1fr 1fr",
            }}
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
                Client
              </label>
              <select
                required
                value={formData.user_id}
                onChange={(e) => handleInputChange("user_id", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "120px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                <option value="">Select Client</option>
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
                  maxWidth: "120px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                <option value="membership">Membership</option>
                <option value="product">Product</option>
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
                    maxWidth: "120px",
                    background: "#1a1a1a",
                    border: "1px solid #374151",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: 6,
                  }}
                >
                  {membershipTypes.map((type) => (
                    <option key={type.id} value={type.type}>
                      {type.type.replace("_", " ")}
                    </option>
                  ))}
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
                    maxWidth: "120px",
                    background: "#1a1a1a",
                    border: "1px solid #374151",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: 6,
                  }}
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
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
                value={formData.quantity}
                onChange={(e) =>
                  handleInputChange("quantity", parseInt(e.target.value))
                }
                required
                style={{
                  width: "100%",
                  maxWidth: "120px",
                  background: "#1a1a1a",
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
                Date
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  handleInputChange("transaction_date", e.target.value)
                }
                required
                style={{
                  width: "100%",
                  maxWidth: "120px",
                  background: "#1a1a1a",
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
                  padding: "12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                  resize: "vertical",
                }}
                placeholder="Optional transaction notes..."
                rows={3}
              />
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingTransaction(null);
                }}
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: "#057a1a",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Update Transaction
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Digital Receipt Modal */}
      {showReceipt && receiptTransaction && (
        <Modal
          title="Digital Receipt"
          onClose={() => {
            setShowReceipt(false);
            setReceiptTransaction(null);
          }}
          maxWidth={500}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#000000",
              padding: "24px",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            {/* Receipt Header */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
                borderBottom: "2px solid #000",
                paddingBottom: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                URBN FITNESS GYM
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                Digital Receipt
              </div>
              <div
                style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}
              >
                {new Date().toLocaleDateString()}{" "}
                {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* Transaction Details */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  <strong>Receipt #:</strong>
                </span>
                <span>#{receiptTransaction.id}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  <strong>Client:</strong>
                </span>
                <span>{receiptTransaction.user?.name}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  <strong>Email:</strong>
                </span>
                <span>{receiptTransaction.user?.email}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  <strong>Type:</strong>
                </span>
                <span style={{ textTransform: "capitalize" }}>
                  {receiptTransaction.transaction_type}
                </span>
              </div>

              {receiptTransaction.transaction_type === "membership" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span>
                      <strong>Membership:</strong>
                    </span>
                    <span>
                      {receiptTransaction.membership?.type?.replace("_", " ")}
                    </span>
                  </div>
                  {receiptTransaction.membership?.start_date && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span>
                        <strong>Start Date:</strong>
                      </span>
                      <span>
                        {new Date(
                          receiptTransaction.membership.start_date
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {receiptTransaction.membership?.end_date && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span>
                        <strong>End Date:</strong>
                      </span>
                      <span>
                        {new Date(
                          receiptTransaction.membership.end_date
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </>
              )}

              {receiptTransaction.transaction_type === "product" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span>
                      <strong>Product:</strong>
                    </span>
                    <span>{receiptTransaction.product?.name}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span>
                      <strong>Unit Price:</strong>
                    </span>
                    <span>₱{receiptTransaction.product?.price}</span>
                  </div>
                </>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  <strong>Quantity:</strong>
                </span>
                <span>{receiptTransaction.quantity}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  <strong>Payment Mode:</strong>
                </span>
                <span style={{ textTransform: "capitalize" }}>
                  {receiptTransaction.payment_mode}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span>
                  <strong>Transaction Date:</strong>
                </span>
                <span>
                  {new Date(
                    receiptTransaction.transaction_date
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Total */}
            <div
              style={{
                borderTop: "2px solid #000",
                paddingTop: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                <span>TOTAL:</span>
                <span>₱{receiptTransaction.total_amount}</span>
              </div>
            </div>

            {/* Notes */}
            {receiptTransaction.notes && (
              <div
                style={{
                  marginBottom: "20px",
                  borderTop: "1px solid #ccc",
                  paddingTop: "10px",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  Notes:
                </div>
                <div>{receiptTransaction.notes}</div>
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                textAlign: "center",
                fontSize: "12px",
                color: "#666",
                borderTop: "1px solid #ccc",
                paddingTop: "10px",
              }}
            >
              <div>Thank you for your business!</div>
              <div style={{ marginTop: "4px" }}>
                URBN FITNESS GYM - Your Fitness Journey Starts Here
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Search Section */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Search transactions by user name, email, product, membership type, amount, quantity, payment mode, date, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "#1a1a1a",
              border: "1px solid #374151",
              borderRadius: 8,
              color: "#e5e7eb",
              fontSize: 14,
            }}
          />
        </div>
        {searchTerm && (
          <div
            style={{
              color: "#9ca3af",
              fontSize: 14,
              whiteSpace: "nowrap",
              marginLeft: 20,
            }}
          >
            {filteredTransactions.length} transaction
            {filteredTransactions.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div
        style={{
          background: "#000000",
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
                background: "#1a1a1a",
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
            {filteredTransactions.map((r) => (
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
                      background: "#1a1a1a",
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
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        setEditingTransaction(r);
                        setShowEditForm(true);
                      }}
                      style={{
                        background: "#071d63",
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setReceiptTransaction(r);
                        setShowReceipt(true);
                      }}
                      style={{
                        background: "#057a1a",
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Receipt
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(r.id)}
                      disabled={deletingTransaction === r.id}
                      style={{
                        background:
                          deletingTransaction === r.id ? "#6b7280" : "#ef4444",
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor:
                          deletingTransaction === r.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {deletingTransaction === r.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTransactions.length === 0 && rows && rows.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            No transactions found matching your search
          </div>
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            Try adjusting your search terms or type filter
          </div>
        </div>
      )}

      {rows && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            No transactions found
          </div>
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            Click "Add Transaction" to create your first transaction
          </div>
        </div>
      )}
    </div>
  );
}
