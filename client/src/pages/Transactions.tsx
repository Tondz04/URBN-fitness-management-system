import * as React from "react";
import { Modal } from "../components/Modal";
import { Status } from "../components/Status";
import { useTheme } from "../contexts/ThemeContext";
import { useNotification } from "../contexts/NotificationContext";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { SearchableSelect } from "../components/SearchableSelect";

// Print styles for receipt
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    #receipt-content, #receipt-content * {
      visibility: visible;
    }
    #receipt-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white;
      padding: 20px;
    }
    button {
      display: none !important;
    }
  }
`;

export default function Transactions() {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const isDark = theme === "dark";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6"; // Light gray for cards in light mode
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db"; // Darker border for visibility
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

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
  const [detailsTransaction, setDetailsTransaction] = React.useState<
    any | null
  >(null);
  const [filterType, setFilterType] = React.useState<string>("");
  const [filterStatus, setFilterStatus] = React.useState<string>("");
  const [filterMonth, setFilterMonth] = React.useState<string>(() => {
    // Default to current month (YYYY-MM format)
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [users, setUsers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [membershipTypes, setMembershipTypes] = React.useState<any[]>([]);
  const [deletingTransaction, setDeletingTransaction] = React.useState<
    number | null
  >(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState<{
    isOpen: boolean;
    transactionId: number | null;
  }>({ isOpen: false, transactionId: null });

  // Smart column filtering states
  const [typeSort, setTypeSort] = React.useState<
    "default" | "membership" | "product"
  >("default");
  const [amountSort, setAmountSort] = React.useState<
    "default" | "low" | "high"
  >("default");
  const [dateSort, setDateSort] = React.useState<
    "default" | "oldest" | "newest"
  >("default");
  const [statusFilter, setStatusFilter] = React.useState<
    "default" | "paid" | "pending" | "cancelled" | "refunded"
  >("default");

  // Add customer modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = React.useState(false);

  // Transactions are already filtered by backend
  let filteredTransactions = rows || [];

  // Apply smart column filtering
  if (typeSort !== "default") {
    filteredTransactions = [...filteredTransactions].filter((t) => {
      if (typeSort === "membership") return t.transaction_type === "membership";
      if (typeSort === "product") return t.transaction_type === "product";
      return true;
    });
  }

  if (amountSort !== "default") {
    filteredTransactions = [...filteredTransactions].sort((a, b) => {
      if (amountSort === "low") return a.total_amount - b.total_amount;
      if (amountSort === "high") return b.total_amount - a.total_amount;
      return 0;
    });
  }

  if (dateSort !== "default") {
    filteredTransactions = [...filteredTransactions].sort((a, b) => {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      if (dateSort === "oldest") return dateA - dateB;
      if (dateSort === "newest") return dateB - dateA;
      return 0;
    });
  }

  if (statusFilter !== "default") {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.status === statusFilter
    );
  }

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

  // Initial load
  React.useEffect(() => {
    fetchUsers();
    fetchProducts();
    fetchMembershipTypes();
  }, []);

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

  const fetchData = React.useCallback(async () => {
    try {
      let url = "/api/transactions";
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterType) params.append("type", filterType);
      if (filterStatus) params.append("status", filterStatus);

      // Add month filter (start and end date of the month)
      if (filterMonth) {
        const [year, month] = filterMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(
          parseInt(year),
          parseInt(month),
          0,
          23,
          59,
          59
        );
        params.append("start_date", startDate.toISOString().split("T")[0]);
        params.append("end_date", endDate.toISOString().split("T")[0]);
      }

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
  }, [searchTerm, filterType, filterStatus, filterMonth]);

  // Initial load
  React.useEffect(() => {
    fetchData();
  }, []);

  // When filters change, fetch immediately
  React.useEffect(() => {
    fetchData();
  }, [filterType, filterStatus, filterMonth, fetchData]);

  // Debounce search to prevent page refreshes
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 800); // Increased debounce time to prevent refreshes

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchData]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
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
        // Convert object to array format for SearchableSelect
        const typesArray = Object.entries(data.data || {}).map(
          ([key, value]: [string, any]) => ({
            key,
            name: value.name,
            price: value.price,
            duration_days: value.duration_days,
          })
        );
        setMembershipTypes(typesArray);
      }
    } catch (err) {
      console.error("Failed to fetch membership types:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.user_id) {
      showError("Please select a customer");
      return;
    }
    if (!formData.transaction_type) {
      showError("Please select a transaction type");
      return;
    }
    if (
      formData.transaction_type === "membership" &&
      !formData.membership_type
    ) {
      showError("Please select a membership type");
      return;
    }
    if (formData.transaction_type === "product" && !formData.product_id) {
      showError("Please select a product");
      return;
    }
    if (!formData.transaction_date) {
      showError("Please select a transaction date");
      return;
    }
    if (formData.quantity < 1) {
      showError("Quantity must be at least 1");
      return;
    }

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
      fetchUsers(); // Refresh customers to update membership info
      fetchProducts(); // Refresh products to update stock levels
      showSuccess("Transaction created successfully!");
    } catch (err: any) {
      console.error("Failed to create transaction:", err);
      showError(
        err.message || "Failed to create transaction. Please try again."
      );
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    // Validation
    if (!formData.user_id) {
      showError("Please select a customer");
      return;
    }
    if (!formData.transaction_type) {
      showError("Please select a transaction type");
      return;
    }
    if (
      formData.transaction_type === "membership" &&
      !formData.membership_type
    ) {
      showError("Please select a membership type");
      return;
    }
    if (formData.transaction_type === "product" && !formData.product_id) {
      showError("Please select a product");
      return;
    }
    if (!formData.transaction_date) {
      showError("Please select a transaction date");
      return;
    }
    if (formData.quantity < 1) {
      showError("Quantity must be at least 1");
      return;
    }

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
      fetchUsers(); // Refresh customers to update membership info
      fetchProducts(); // Refresh products to update stock levels
      showSuccess("Transaction updated successfully!");
    } catch (err: any) {
      console.error("Failed to update transaction:", err);
      showError(
        err.message || "Failed to update transaction. Please try again."
      );
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    setConfirmDelete({ isOpen: true, transactionId });
  };

  const confirmDeleteTransaction = async () => {
    if (!confirmDelete.transactionId) return;

    try {
      setDeletingTransaction(confirmDelete.transactionId);
      const response = await fetch(
        `/api/transactions/${confirmDelete.transactionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete transaction");
      }

      fetchData();
      fetchUsers(); // Refresh customers to update membership info
      fetchProducts(); // Refresh products to update stock levels
      showSuccess("Transaction deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete transaction:", err);
      showError(
        err.message || "Failed to delete transaction. Please try again."
      );
    } finally {
      setDeletingTransaction(null);
      setConfirmDelete({ isOpen: false, transactionId: null });
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
          background: bgSecondary,
          padding: 16,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          marginBottom: 16,
          display: "flex",
          gap: 16,
          alignItems: "center",
          color: textPrimary,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              color: textPrimary,
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            Type
          </label>
          <SearchableSelect
            value={filterType}
            onChange={(value) => setFilterType(value.toString())}
            options={[
              { value: "", label: "All Types" },
              { value: "membership", label: "Membership" },
              { value: "product", label: "Product" },
            ]}
            placeholder="All Types"
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              color: textPrimary,
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            Month
          </label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{
              background: isDark ? "#1a1a1a" : "#ffffff",
              border: `1px solid ${borderColor}`,
              color: textPrimary,
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              color: textPrimary,
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            Status
          </label>
          <SearchableSelect
            value={filterStatus}
            onChange={(value) => setFilterStatus(value.toString())}
            options={[
              { value: "", label: "All Status" },
              { value: "pending", label: "Pending" },
              { value: "paid", label: "Paid" },
              { value: "refunded", label: "Refunded" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            placeholder="All Status"
          />
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddForm && (
        <Modal
          title="Add New Transaction"
          onClose={() => setShowAddForm(false)}
          maxWidth={800}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              width: "100%",
            }}
          >
            {/* Row 1: User and Transaction Type */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                width: "100%",
              }}
            >
              <SearchableSelect
                value={formData.user_id}
                onChange={(value) => handleInputChange("user_id", value)}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                  subtitle: user.email ? `ID: ${user.id}` : undefined,
                }))}
                placeholder="Select Customer"
                required
                label="Customer"
                searchPlaceholder="Search by name or ID..."
                showAddOption={true}
                onNoResults={() => setShowAddCustomerModal(true)}
                noResultsText="No customer found"
              />

              <div>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Transaction Type
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                </label>
                <select
                  required
                  value={formData.transaction_type}
                  onChange={(e) =>
                    handleInputChange("transaction_type", e.target.value)
                  }
                  style={{
                    width: "100%",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    minHeight: "48px",
                    cursor: "pointer",
                  }}
                >
                  <option value="membership">Membership</option>
                  <option value="product">Product Purchase</option>
                </select>
              </div>
            </div>

            {/* Row 2: Membership Type or Product (conditional) */}
            {formData.transaction_type === "membership" && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Membership Type
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                </label>
                <SearchableSelect
                  value={formData.membership_type}
                  onChange={(value) =>
                    handleInputChange("membership_type", value)
                  }
                  options={
                    Array.isArray(membershipTypes)
                      ? membershipTypes.map((type: any) => ({
                          value: type.key || type.type,
                          label: type.name,
                          subtitle: `₱${
                            type.price?.toLocaleString() || type.price
                          }`,
                        }))
                      : Object.entries(membershipTypes || {}).map(
                          ([key, type]: [string, any]) => ({
                            value: key,
                            label: type.name,
                            subtitle: `₱${
                              type.price?.toLocaleString() || type.price
                            }`,
                          })
                        )
                  }
                  placeholder="Select Membership Type"
                  required
                  searchPlaceholder="Search membership types..."
                />
              </div>
            )}

            {formData.transaction_type === "product" && (
              <div>
                <SearchableSelect
                  value={formData.product_id}
                  onChange={(value) => handleInputChange("product_id", value)}
                  options={products.map((product) => ({
                    value: product.id,
                    label: product.name,
                    subtitle: `₱${product.price.toLocaleString()} • Stock: ${
                      product.stock
                    }`,
                  }))}
                  placeholder="Select Product"
                  required
                  label="Product"
                  searchPlaceholder="Search by product name or ID..."
                />
              </div>
            )}

            {/* Row 3: Quantity, Payment Mode, and Date */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                width: "100%",
              }}
            >
              <div style={{ minWidth: 0, width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Quantity
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", parseInt(e.target.value) || 1)
                  }
                  placeholder="Enter quantity"
                  style={{
                    width: "100%",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    minHeight: "44px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ minWidth: 0, width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Payment Mode
                </label>
                <div
                  style={{
                    width: "100%",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: "44px",
                    fontSize: "15px",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ fontSize: 16 }}>💵</span>
                  <span style={{ fontWeight: 500 }}>Cash</span>
                </div>
              </div>

              <div style={{ minWidth: 0, width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Date
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
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
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    minHeight: "44px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 4: Notes (full width) */}
            <div>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Add any additional notes about this transaction..."
                style={{
                  width: "100%",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "12px 16px",
                  borderRadius: "8px",
                  minHeight: "100px",
                  fontSize: "16px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Row 5: Submit Button */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                paddingTop: 8,
                borderTop: `1px solid ${borderColor}`,
              }}
            >
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  background: "transparent",
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "16px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = bgSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: "#057a1a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "16px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#046614";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#057a1a";
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
          maxWidth={800}
        >
          <form
            onSubmit={handleEditSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              width: "100%",
            }}
          >
            {/* Row 1: User and Transaction Type */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                width: "100%",
              }}
            >
              <SearchableSelect
                value={formData.user_id}
                onChange={(value) => handleInputChange("user_id", value)}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                  subtitle: user.email ? `ID: ${user.id}` : undefined,
                }))}
                placeholder="Select Customer"
                required
                label="Customer"
                searchPlaceholder="Search by name or ID..."
                showAddOption={true}
                onNoResults={() => setShowAddCustomerModal(true)}
                noResultsText="No customer found"
              />

              <div style={{ minWidth: 0, width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Transaction Type
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                </label>
                <select
                  required
                  value={formData.transaction_type}
                  onChange={(e) =>
                    handleInputChange("transaction_type", e.target.value)
                  }
                  style={{
                    width: "100%",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    minHeight: "48px",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="membership">Membership</option>
                  <option value="product">Product Purchase</option>
                </select>
              </div>
            </div>

            {/* Row 2: Membership Type or Product (conditional) */}
            {formData.transaction_type === "membership" && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Membership Type
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                </label>
                <SearchableSelect
                  value={formData.membership_type}
                  onChange={(value) =>
                    handleInputChange("membership_type", value)
                  }
                  options={
                    Array.isArray(membershipTypes)
                      ? membershipTypes.map((type: any) => ({
                          value: type.key || type.type,
                          label: type.name,
                          subtitle: `₱${
                            type.price?.toLocaleString() || type.price
                          }`,
                        }))
                      : Object.entries(membershipTypes || {}).map(
                          ([key, type]: [string, any]) => ({
                            value: key,
                            label: type.name,
                            subtitle: `₱${
                              type.price?.toLocaleString() || type.price
                            }`,
                          })
                        )
                  }
                  placeholder="Select Membership Type"
                  required
                  searchPlaceholder="Search membership types..."
                />
              </div>
            )}

            {formData.transaction_type === "product" && (
              <div>
                <SearchableSelect
                  value={formData.product_id}
                  onChange={(value) => handleInputChange("product_id", value)}
                  options={products.map((product) => ({
                    value: product.id,
                    label: product.name,
                    subtitle: `₱${product.price.toLocaleString()} • Stock: ${
                      product.stock
                    }`,
                  }))}
                  placeholder="Select Product"
                  required
                  label="Product"
                  searchPlaceholder="Search by product name or ID..."
                />
              </div>
            )}

            {/* Row 3: Quantity, Payment Mode, and Date */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                width: "100%",
              }}
            >
              <div style={{ minWidth: 0, width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Quantity
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", parseInt(e.target.value) || 1)
                  }
                  placeholder="Enter quantity"
                  style={{
                    width: "100%",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    minHeight: "44px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ minWidth: 0, width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Payment Mode
                </label>
                <div
                  style={{
                    width: "100%",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: "44px",
                    fontSize: "15px",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ fontSize: 16 }}>💵</span>
                  <span style={{ fontWeight: 500 }}>Cash</span>
                </div>
              </div>

              <div style={{ minWidth: 0, width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  Date
                  <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>
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
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    minHeight: "44px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Row 4: Notes (full width) */}
            <div>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Add any additional notes about this transaction..."
                style={{
                  width: "100%",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "12px 16px",
                  borderRadius: "8px",
                  minHeight: "100px",
                  fontSize: "16px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Row 5: Submit Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                paddingTop: 8,
                borderTop: `1px solid ${borderColor}`,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingTransaction(null);
                }}
                style={{
                  background: "transparent",
                  color: textPrimary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "16px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = bgSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: "#057a1a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "16px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#046614";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#057a1a";
                }}
              >
                Update Transaction
              </button>
            </div>
          </form>
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
                  color: textSecondary,
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Client
              </label>
              <SearchableSelect
                required
                value={formData.user_id}
                onChange={(value) => handleInputChange("user_id", value.toString())}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                }))}
                placeholder="Select Client"
                searchPlaceholder="Search clients..."
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Transaction Type
              </label>
              <SearchableSelect
                required
                value={formData.transaction_type}
                onChange={(value) =>
                  handleInputChange("transaction_type", value.toString())
                }
                options={[
                  { value: "membership", label: "Membership" },
                  { value: "product", label: "Product" },
                ]}
                placeholder="Select Type"
              />
            </div>

            {formData.transaction_type === "membership" && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Membership Type
                </label>
                <SearchableSelect
                  required
                  value={formData.membership_type}
                  onChange={(value) =>
                    handleInputChange("membership_type", value.toString())
                  }
                  options={
                    Array.isArray(membershipTypes)
                      ? membershipTypes.map((type: any) => ({
                          value: type.key || type.type,
                          label:
                            type.name ||
                            (type.key || type.type)
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l: string) => l.toUpperCase()),
                        }))
                      : Object.entries(membershipTypes || {}).map(
                          ([key, type]: [string, any]) => ({
                            value: key,
                            label:
                              type.name ||
                              key
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l: string) =>
                                  l.toUpperCase()
                                ),
                          })
                        )
                  }
                  placeholder="Select Membership Type"
                  searchPlaceholder="Search membership types..."
                />
              </div>
            )}

            {formData.transaction_type === "product" && (
              <div>
                <label
                  style={{
                    display: "block",
                    color: textSecondary,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  Product
                </label>
                <SearchableSelect
                  required
                  value={formData.product_id}
                  onChange={(value) =>
                    handleInputChange("product_id", value.toString())
                  }
                  options={products.map((product) => ({
                    value: product.id,
                    label: product.name,
                  }))}
                  placeholder="Select Product"
                  searchPlaceholder="Search products..."
                />
              </div>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
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
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
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
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
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
                  color: textPrimary,
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
                  color: textPrimary,
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
            id="receipt-content"
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
                    {receiptTransaction.membership?.type
                      ?.replace(/_/g, " ")
                      .replace(/\b\w/g, (l: string) => l.toUpperCase())}
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
                    <span>
                      {receiptTransaction.product?.name ||
                        (receiptTransaction.product_id
                          ? `Product #${receiptTransaction.product_id} (Deleted)`
                          : "Unknown Product")}
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

          {/* Print Button */}
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <style>{printStyles}</style>
            <button
              onClick={() => {
                window.print();
              }}
              style={{
                background: "#3b82f6",
                color: textPrimary,
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              🖨️ Print Receipt
            </button>
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
            placeholder="Search by ID, user name, email, product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 18px",
              background: "var(--bg-secondary, #f9fafb)",
              border: "1px solid var(--border-color, #e5e7eb)",
              borderRadius: 8,
              color: "var(--text-primary, #111827)",
              fontSize: 16,
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
          background: bgSecondary,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
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
                color: textSecondary,
                textAlign: "left",
                background: isDark ? "#1a1a1a" : "#f3f4f6",
              }}
            >
              <th style={{ padding: 16 }}>ID</th>
              <th style={{ padding: 16 }}>User</th>
              <th
                style={{
                  padding: 16,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => {
                  if (typeSort === "default") setTypeSort("membership");
                  else if (typeSort === "membership") setTypeSort("product");
                  else setTypeSort("default");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#f3f4f6";
                }}
              >
                Type {typeSort === "membership" && "↑"}{" "}
                {typeSort === "product" && "↑"}
              </th>
              <th style={{ padding: 16 }}>Details</th>
              <th
                style={{
                  padding: 16,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => {
                  if (amountSort === "default") setAmountSort("low");
                  else if (amountSort === "low") setAmountSort("high");
                  else setAmountSort("default");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#f3f4f6";
                }}
              >
                Amount {amountSort === "low" && "↑"}{" "}
                {amountSort === "high" && "↓"}
              </th>
              <th
                style={{
                  padding: 16,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => {
                  if (dateSort === "default") setDateSort("oldest");
                  else if (dateSort === "oldest") setDateSort("newest");
                  else setDateSort("default");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#f3f4f6";
                }}
              >
                Date {dateSort === "oldest" && "↑"}{" "}
                {dateSort === "newest" && "↓"}
              </th>
              <th
                style={{
                  padding: 16,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => {
                  if (statusFilter === "default") setStatusFilter("paid");
                  else if (statusFilter === "paid") setStatusFilter("pending");
                  else if (statusFilter === "pending")
                    setStatusFilter("cancelled");
                  else if (statusFilter === "cancelled")
                    setStatusFilter("refunded");
                  else setStatusFilter("default");
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark
                    ? "#1a1a1a"
                    : "#f3f4f6";
                }}
              >
                Status {statusFilter !== "default" && `(${statusFilter})`}
              </th>
              <th style={{ padding: 16 }}>Payment</th>
              <th style={{ padding: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((r) => (
              <tr key={r.id}>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  {r.id}
                </td>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.user?.name}</div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      {r.user?.email}
                    </div>
                  </div>
                </td>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  <div
                    style={{
                      background:
                        r.transaction_type === "membership"
                          ? "#3b82f6"
                          : "#f59e0b",
                      color: textPrimary,
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
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                    cursor: "pointer",
                  }}
                  onClick={() => setDetailsTransaction(r)}
                  title="Click to view details"
                >
                  {r.transaction_type === "membership" ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {r.membership?.type
                          ?.replace(/_/g, " ")
                          .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                      <div style={{ color: textSecondary, fontSize: 12 }}>
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
                      <div style={{ fontWeight: 600 }}>
                        {r.product?.name ||
                          (r.product_id
                            ? `Product #${r.product_id}`
                            : "Unknown Product")}
                      </div>
                      <div style={{ color: textSecondary, fontSize: 12 }}>
                        Qty: {r.quantity}
                      </div>
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>₱{r.total_amount}</div>
                  {r.quantity > 1 && (
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      ₱{r.unit_price} each
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  {new Date(r.transaction_date).toLocaleDateString()}
                </td>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  <Status value={r.status} />
                </td>
                <td
                  style={{ padding: 16, borderTop: `1px solid ${borderColor}` }}
                >
                  <div
                    style={{
                      background: isDark ? "#1a1a1a" : "#e5e7eb",
                      color: isDark ? textPrimary : "#111827",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      textTransform: "capitalize",
                      display: "inline-block",
                    }}
                  >
                    {r.payment_mode}
                  </div>
                </td>
                <td
                  style={{ padding: 16, borderTop: `1px solid ${borderColor}` }}
                >
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        setEditingTransaction(r);
                        setShowEditForm(true);
                      }}
                      style={{
                        background: "#071d63",
                        color: "#ffffff",
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
                        color: "#ffffff",
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
                        color: "#ffffff",
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, transactionId: null })}
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonStyle="danger"
      />

      {/* Transaction Details Modal */}
      {detailsTransaction && (
        <Modal
          title="Transaction Details"
          onClose={() => setDetailsTransaction(null)}
          maxWidth={700}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>
                Transaction ID
              </div>
              <div style={{ color: textPrimary, fontWeight: 700 }}>
                #{detailsTransaction.id}
              </div>
            </div>
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>Date</div>
              <div style={{ color: textPrimary }}>
                {new Date(
                  detailsTransaction.transaction_date
                ).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>Customer</div>
              <div style={{ color: textPrimary, fontWeight: 600 }}>
                {detailsTransaction.user?.name || "Unknown"}
              </div>
            </div>
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>Email</div>
              <div style={{ color: textPrimary }}>
                {detailsTransaction.user?.email || "—"}
              </div>
            </div>
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>Type</div>
              <div
                style={{
                  color: textPrimary,
                  textTransform: "capitalize",
                  fontWeight: 600,
                }}
              >
                {detailsTransaction.transaction_type}
              </div>
            </div>
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>Status</div>
              <div style={{ color: textPrimary, textTransform: "capitalize" }}>
                {detailsTransaction.status}
              </div>
            </div>
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>
                Payment Mode
              </div>
              <div style={{ color: textPrimary, textTransform: "capitalize" }}>
                {detailsTransaction.payment_mode || "Cash"}
              </div>
            </div>
            <div>
              <div style={{ color: textSecondary, fontSize: 12 }}>
                Total Amount
              </div>
              <div
                style={{
                  color: "#10b981",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                ₱{detailsTransaction.total_amount?.toLocaleString() || "0.00"}
              </div>
            </div>
            {detailsTransaction.transaction_type === "membership" && (
              <>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    Membership Type
                  </div>
                  <div style={{ color: textPrimary, fontWeight: 600 }}>
                    {detailsTransaction.membership?.type
                      ?.replace(/_/g, " ")
                      .replace(/\b\w/g, (l: string) => l.toUpperCase()) || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    Start Date
                  </div>
                  <div style={{ color: textPrimary }}>
                    {detailsTransaction.membership?.start_date
                      ? new Date(
                          detailsTransaction.membership.start_date
                        ).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    End Date
                  </div>
                  <div style={{ color: textPrimary }}>
                    {detailsTransaction.membership?.end_date
                      ? new Date(
                          detailsTransaction.membership.end_date
                        ).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    Membership Fee
                  </div>
                  <div style={{ color: textPrimary }}>
                    ₱
                    {detailsTransaction.membership?.fee?.toLocaleString() ||
                      detailsTransaction.total_amount?.toLocaleString() ||
                      "0.00"}
                  </div>
                </div>
              </>
            )}
            {detailsTransaction.transaction_type === "product" && (
              <>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    Product Name
                  </div>
                  <div style={{ color: textPrimary, fontWeight: 600 }}>
                    {detailsTransaction.product?.name ||
                      (detailsTransaction.product_id
                        ? `Product #${detailsTransaction.product_id} (Deleted)`
                        : "Unknown Product")}
                  </div>
                </div>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    Category
                  </div>
                  <div
                    style={{ color: textPrimary, textTransform: "capitalize" }}
                  >
                    {detailsTransaction.product?.category || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    Quantity
                  </div>
                  <div style={{ color: textPrimary, fontWeight: 600 }}>
                    {detailsTransaction.quantity || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: textSecondary, fontSize: 12 }}>
                    Unit Price
                  </div>
                  <div style={{ color: textPrimary }}>
                    ₱{detailsTransaction.unit_price?.toLocaleString() || "0.00"}
                  </div>
                </div>
              </>
            )}
            {detailsTransaction.notes && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ color: textSecondary, fontSize: 12 }}>Notes</div>
                <div style={{ color: textPrimary }}>
                  {detailsTransaction.notes}
                </div>
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              paddingTop: 24,
              borderTop: `1px solid ${borderColor}`,
            }}
          >
            <button
              onClick={() => {
                setEditingTransaction(detailsTransaction);
                setDetailsTransaction(null);
                setShowEditForm(true);
              }}
              style={{
                background: "#071d63",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
                flex: 1,
              }}
            >
              Edit Transaction
            </button>
            <button
              onClick={() => {
                setReceiptTransaction(detailsTransaction);
                setDetailsTransaction(null);
                setShowReceipt(true);
              }}
              style={{
                background: "#057a1a",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: "pointer",
                flex: 1,
              }}
            >
              View Receipt
            </button>
          </div>
        </Modal>
      )}

      {/* Add Customer Modal (from Transaction Form) */}
      {showAddCustomerModal && (
        <Modal
          title="Add New Customer"
          onClose={() => {
            setShowAddCustomerModal(false);
          }}
          maxWidth={600}
        >
          <AddCustomerForm
            onSuccess={(newCustomer) => {
              setUsers([...users, newCustomer]);
              handleInputChange("user_id", newCustomer.id);
              setShowAddCustomerModal(false);
              fetchUsers(); // Refresh users list
              showSuccess("Customer created successfully!");
            }}
            onCancel={() => setShowAddCustomerModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// Add Customer Form Component (Reusable)
function AddCustomerForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (customer: any) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const isDark = theme === "dark";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";

  const [formData, setFormData] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    age: "",
    address: "",
    rfid_tag: "",
    status: "active",
    notes: "",
  });

  const generateRFID = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `GYM-${timestamp}-${random}`;
  };

  React.useEffect(() => {
    setFormData((prev) => ({ ...prev, rfid_tag: generateRFID() }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          email: formData.email,
          phone: formData.phone,
          age: formData.age ? parseInt(formData.age) : null,
          address: formData.address,
          rfid_tag: formData.rfid_tag,
          status: formData.status,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create customer");
      }

      const result = await response.json();
      onSuccess(result.data);
    } catch (err: any) {
      showError(err.message || "Failed to create customer");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              color: textPrimary,
              fontWeight: 600,
            }}
          >
            First Name *
          </label>
          <input
            type="text"
            required
            value={formData.first_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                first_name: e.target.value.toUpperCase(),
              })
            }
            style={{
              width: "100%",
              padding: "12px",
              background: isDark ? "#1a1a1a" : "#ffffff",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              color: textPrimary,
              fontSize: 16,
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              color: textPrimary,
              fontWeight: 600,
            }}
          >
            Last Name *
          </label>
          <input
            type="text"
            required
            value={formData.last_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                last_name: e.target.value.toUpperCase(),
              })
            }
            style={{
              width: "100%",
              padding: "12px",
              background: isDark ? "#1a1a1a" : "#ffffff",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              color: textPrimary,
              fontSize: 16,
            }}
          />
        </div>
      </div>
      <div>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            color: textPrimary,
            fontWeight: 600,
          }}
        >
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={{
            width: "100%",
            padding: "12px",
            background: isDark ? "#1a1a1a" : "#ffffff",
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            color: textPrimary,
            fontSize: 16,
          }}
        />
      </div>
      <div>
        <label
          style={{
            display: "block",
            marginBottom: 8,
            color: textPrimary,
            fontWeight: 600,
          }}
        >
          Phone *
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setFormData({ ...formData, phone: value });
          }}
          style={{
            width: "100%",
            padding: "12px",
            background: isDark ? "#1a1a1a" : "#ffffff",
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            color: textPrimary,
            fontSize: 16,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "transparent",
            color: textPrimary,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: "12px 24px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 16,
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
            fontSize: 16,
          }}
        >
          Create Customer
        </button>
      </div>
    </form>
  );
}
