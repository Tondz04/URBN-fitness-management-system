import * as React from "react";
import { Modal } from "../components/Modal";
import { useTheme } from "../contexts/ThemeContext";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { SearchableSelect } from "../components/SearchableSelect";

export default function Clients() {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6"; // Light gray for cards
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db"; // Darker border
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

  const [clients, setClients] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [showEditForm, setShowEditForm] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<any | null>(null);
  const [deletingClient, setDeletingClient] = React.useState<number | null>(
    null
  );
  const [detailsClient, setDetailsClient] = React.useState<any | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [rfidAssignClient, setRfidAssignClient] = React.useState<any | null>(null);
  const [rfidInput, setRfidInput] = React.useState("");
  const [rfidInputFocused, setRfidInputFocused] = React.useState(false);
  const [lastScanTime, setLastScanTime] = React.useState(0);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  // Clients are already filtered by backend, but keep for local filtering if needed
  const filteredClients = clients || [];

  // Email validation function
  const validateEmail = (email: string): boolean => {
    if (!email || email.trim() === "") return false;
    
    // Strict email regex pattern
    // This pattern ensures:
    // - One @ symbol
    // - Valid local part (before @)
    // - Valid domain part (after @)
    // - No consecutive dots
    // - Proper TLD (at least 2 characters, letters only)
    const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
    
    // Additional checks
    // No consecutive dots
    if (email.includes("..")) return false;
    // No dot at start or end of local part
    if (email.startsWith(".") || email.startsWith("@")) return false;
    // Only one @ symbol
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) return false;
    // Domain must have at least one dot
    const parts = email.split("@");
    if (parts.length !== 2) return false;
    const domain = parts[1];
    if (!domain.includes(".")) return false;
    // TLD must be at least 2 characters and only letters
    const tld = domain.split(".").pop();
    if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
    // No consecutive dots in domain
    if (domain.includes("..")) return false;
    // No dot at start or end of domain
    if (domain.startsWith(".") || domain.endsWith(".")) return false;
    
    return emailRegex.test(email);
  };

  // Form state for adding new client
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

  React.useEffect(() => {
    fetchClients();
  }, []);

  // Generate unique RFID tag
  const generateRFID = () => {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `GYM-${timestamp}-${random}`;
  };

  // Generate RFID when form opens
  React.useEffect(() => {
    if (showAddForm) {
      setFormData((prev) => ({
        ...prev,
        rfid_tag: generateRFID(),
      }));
    }
  }, [showAddForm]);

  // Populate form data when editing
  React.useEffect(() => {
    if (showEditForm && editingClient) {
      const extraDetails = getClientDetails(editingClient);
      setFormData({
        first_name:
          extraDetails.first_name || editingClient.name?.split(" ")[0] || "",
        last_name:
          extraDetails.last_name ||
          editingClient.name?.split(" ").slice(1).join(" ") ||
          "",
        email: editingClient.email || "",
        phone: editingClient.phone || "",
        age: extraDetails.age || "",
        address: extraDetails.address || "",
        rfid_tag: editingClient.rfid_tag || generateRFID(),
        status: editingClient.status || "active",
        notes: editingClient.notes || "",
      });
    }
  }, [showEditForm, editingClient]);

  const fetchClients = React.useCallback(async () => {
    try {
      setLoading(true);
      const url = searchTerm
        ? `/api/users?search=${encodeURIComponent(searchTerm)}`
        : "/api/users";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setClients(data.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch clients:", err);
      setError(err.message || "Failed to load clients");
      setClients(null);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Initial load
  React.useEffect(() => {
    fetchClients();
  }, []); // Only on mount

  // Debounce search to prevent page refreshes
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchClients();
    }, 800); // Increased debounce time to prevent refreshes

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchClients]);

  // Local storage helpers for extra client details
  const loadExtraDetails = (): Record<string, any> => {
    try {
      const raw = localStorage.getItem("clientExtraDetails");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveExtraDetails = (email: string, details: any) => {
    const map = loadExtraDetails();
    map[email] = { ...map[email], ...details };
    localStorage.setItem("clientExtraDetails", JSON.stringify(map));
  };

  const getClientDetails = (client: any) => {
    const map = loadExtraDetails();
    const existing = map[client.email];
    if (existing) return existing;
    const placeholder = {
      first_name: client.name?.split(" ")[0] || "Guest",
      last_name: client.name?.split(" ").slice(1).join(" ") || "Customer",
      age: Math.floor(18 + Math.random() * 22),
      address: "Iloilo City, Philippines",
    };
    saveExtraDetails(client.email, placeholder);
    return placeholder;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!validateEmail(formData.email)) {
      setEmailError("Please enter a valid email address (e.g., name@example.com)");
      showError("Please enter a valid email address");
      return;
    }
    setEmailError(null);
    
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          email: formData.email,
          phone: formData.phone,
          rfid_tag: formData.rfid_tag,
          status: formData.status,
          notes: formData.notes,
          age: formData.age,
          address: formData.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create client");
      }

      saveExtraDetails(formData.email, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        age: formData.age,
        address: formData.address,
      });

      // Reset form and refresh data
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        age: "",
        address: "",
        rfid_tag: generateRFID(),
        status: "active",
        notes: "",
      });
      setShowAddForm(false);
      setEmailError(null);
      fetchClients();
      showSuccess("Client created successfully!");
    } catch (err: any) {
      console.error("Failed to create client:", err);
      showError(err.message || "Failed to create client. Please try again.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    // Validate email
    if (!validateEmail(formData.email)) {
      setEmailError("Please enter a valid email address (e.g., name@example.com)");
      showError("Please enter a valid email address");
      return;
    }
    setEmailError(null);

    try {
      const response = await fetch(`/api/users/${editingClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          email: formData.email,
          phone: formData.phone,
          rfid_tag: formData.rfid_tag,
          status: formData.status,
          notes: formData.notes,
          age: formData.age,
          address: formData.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update client");
      }

      saveExtraDetails(formData.email, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        age: formData.age,
        address: formData.address,
      });

      // Reset form and refresh data
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        age: "",
        address: "",
        rfid_tag: generateRFID(),
        status: "active",
        notes: "",
      });
      setShowEditForm(false);
      setEditingClient(null);
      setEmailError(null);
      fetchClients();
      showSuccess("Client updated successfully!");
    } catch (err: any) {
      console.error("Failed to update client:", err);
      showError(err.message || "Failed to update client. Please try again.");
    }
  };

  const [confirmDelete, setConfirmDelete] = React.useState<{
    isOpen: boolean;
    clientId: number | null;
  }>({ isOpen: false, clientId: null });

  const handleDeleteClient = async (clientId: number) => {
    setConfirmDelete({ isOpen: true, clientId });
  };

  const confirmDeleteClient = async () => {
    if (!confirmDelete.clientId) return;

    try {
      setDeletingClient(confirmDelete.clientId);
      const response = await fetch(`/api/users/${confirmDelete.clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete client");
      }

      fetchClients();
      showSuccess("Client deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete client:", err);
      showError(err.message || "Failed to delete client. Please try again.");
    } finally {
      setDeletingClient(null);
      setConfirmDelete({ isOpen: false, clientId: null });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateStatus = async (userId: number, status: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }

      await fetchClients();
      showSuccess("Client status updated successfully!");
    } catch (err: any) {
      console.error("Failed to update user status:", err);
      showError(
        err.message || "Failed to update user status. Please try again."
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10b981";
      case "expired":
        return "#ef4444";
      case "inactive":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "#10b981";
      case "Expired":
        return "#ef4444";
      case "Expiring Soon":
        return "#f59e0b";
      case "No Membership":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#9ca3af" }}>
          Loading customers...
        </div>
      </div>
    );
  }

  if (error || !clients) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 16 }}>
          Failed to load clients
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
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Clients & Memberships</h2>
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
          {showAddForm ? "Cancel" : "Add Client"}
        </button>
      </div>

      {/* Add Client Modal */}
      {showAddForm && (
        <Modal
          title="Add New Client"
          onClose={() => {
            setShowAddForm(false);
            setEmailError(null);
          }}
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
                  color: textSecondary,
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => {
                  // Only allow letters, spaces, hyphens, and apostrophes
                  const value = e.target.value.replace(/[^a-zA-Z\s\-']/g, "");
                  handleInputChange("first_name", value);
                }}
                pattern="[A-Za-z\s\-']+"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter first name (letters only)"
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
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => {
                  // Only allow letters, spaces, hyphens, and apostrophes
                  const value = e.target.value.replace(/[^a-zA-Z\s\-']/g, "");
                  handleInputChange("last_name", value);
                }}
                pattern="[A-Za-z\s\-']+"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter last name (letters only)"
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
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  handleInputChange("email", e.target.value);
                  if (e.target.value && !validateEmail(e.target.value)) {
                    setEmailError("Please enter a valid email address");
                  } else {
                    setEmailError(null);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && !validateEmail(e.target.value)) {
                    setEmailError("Please enter a valid email address (e.g., name@example.com)");
                  } else {
                    setEmailError(null);
                  }
                }}
                pattern="^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${emailError ? "#ef4444" : borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter email address"
              />
              {emailError && (
                <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>
                  {emailError}
                </div>
              )}
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
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Only allow numbers, spaces, dashes, and plus sign
                  const value = e.target.value.replace(/[^0-9\s\-+]/g, "");
                  handleInputChange("phone", value);
                }}
                pattern="[0-9\s\-+]+"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter phone number (numbers only)"
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
                Age
              </label>
              <input
                type="number"
                min="0"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter age"
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
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter address"
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
                RFID Tag (Auto-generated)
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={formData.rfid_tag}
                  readOnly
                  style={{
                    width: "100%",
                    maxWidth: "200px",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textSecondary,
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                  placeholder="Auto-generated RFID"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      rfid_tag: generateRFID(),
                    }))
                  }
                  style={{
                    background: "#071d63",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  title="Generate new RFID"
                >
                  🔄
                </button>
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 11,
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                RFID is auto-generated. Click 🔄 to generate a new one.
              </div>
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
                Status
              </label>
              <SearchableSelect
                value={formData.status}
                onChange={(value) => handleInputChange("status", value.toString())}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                placeholder="Select Status"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
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
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  padding: "12px",
                  borderRadius: 8,
                  minHeight: 80,
                  fontSize: 14,
                  resize: "vertical",
                }}
                placeholder="Optional notes about this client..."
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
                Create Client
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Client Modal */}
      {showEditForm && editingClient && (
        <Modal
          title="Edit Client"
          onClose={() => {
            setShowEditForm(false);
            setEditingClient(null);
            setEmailError(null);
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
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => {
                  // Only allow letters, spaces, hyphens, and apostrophes
                  const value = e.target.value.replace(/[^a-zA-Z\s\-']/g, "");
                  handleInputChange("first_name", value);
                }}
                required
                pattern="[A-Za-z\s\-']+"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
                placeholder="Enter first name (letters only)"
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
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => {
                  // Only allow letters, spaces, hyphens, and apostrophes
                  const value = e.target.value.replace(/[^a-zA-Z\s\-']/g, "");
                  handleInputChange("last_name", value);
                }}
                required
                pattern="[A-Za-z\s\-']+"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
                placeholder="Enter last name (letters only)"
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
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  handleInputChange("email", e.target.value);
                  if (e.target.value && !validateEmail(e.target.value)) {
                    setEmailError("Please enter a valid email address");
                  } else {
                    setEmailError(null);
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value && !validateEmail(e.target.value)) {
                    setEmailError("Please enter a valid email address (e.g., name@example.com)");
                  } else {
                    setEmailError(null);
                  }
                }}
                pattern="^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$"
                required
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${emailError ? "#ef4444" : borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
                placeholder="Enter email"
              />
              {emailError && (
                <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>
                  {emailError}
                </div>
              )}
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
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Only allow numbers, spaces, dashes, and plus sign
                  const value = e.target.value.replace(/[^0-9\s\-+]/g, "");
                  handleInputChange("phone", value);
                }}
                pattern="[0-9\s\-+]+"
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
                placeholder="Enter phone number (numbers only)"
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
                Age
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
                placeholder="Enter age"
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
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                }}
                placeholder="Enter address"
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
                RFID Tag (Auto-generated)
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={formData.rfid_tag}
                  readOnly
                  style={{
                    width: "100%",
                    maxWidth: "200px",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `1px solid ${borderColor}`,
                    color: textSecondary,
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                  placeholder="Auto-generated RFID"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      rfid_tag: generateRFID(),
                    }))
                  }
                  style={{
                    background: "#071d63",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  title="Generate new RFID"
                >
                  🔄
                </button>
              </div>
              <div
                style={{
                  color: textSecondary,
                  fontSize: 11,
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                RFID is auto-generated. Click 🔄 to generate a new one.
              </div>
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
                Status
              </label>
              <SearchableSelect
                value={formData.status}
                onChange={(value) => handleInputChange("status", value.toString())}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "expired", label: "Expired" },
                ]}
                placeholder="Select Status"
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
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  color: textPrimary,
                  fontSize: 14,
                  resize: "vertical",
                }}
                placeholder="Optional notes about this client..."
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
                  setEditingClient(null);
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
                Update Client
              </button>
            </div>
          </form>
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
            placeholder="Search by ID, name, email, phone, RFID tag..."
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
            {filteredClients.length} client
            {filteredClients.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      {/* Clients Table */}
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
              <th style={{ padding: 16 }}>Client</th>
              <th style={{ padding: 16 }}>RFID Tag</th>
              <th style={{ padding: 16 }}>Status</th>
              <th style={{ padding: 16 }}>Membership</th>
              <th style={{ padding: 16 }}>Type</th>
              <th style={{ padding: 16 }}>Fee</th>
              <th style={{ padding: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => (
              <tr key={client.id}>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  <div>
                    <button
                      onClick={() => setDetailsClient(client)}
                      style={{
                        background: "transparent",
                        color: textPrimary,
                        fontWeight: 600,
                        padding: 0,
                        margin: 0,
                        border: 0,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {client.name}
                    </button>
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      {client.email}
                    </div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      {client.phone}
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
                      background: isDark ? "#1a1a1a" : "#e5e7eb",
                      color: isDark ? "#ffffff" : "#111827",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: "monospace",
                      fontWeight: 600,
                    }}
                  >
                    {client.rfid_tag || "No RFID"}
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
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        background: getStatusColor(client.status),
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {client.status}
                    </div>
                    <div style={{ width: 70, maxWidth: 70 }}>
                      <SearchableSelect
                        value={client.status}
                        onChange={(value) =>
                          handleUpdateStatus(client.id, value.toString())
                        }
                        options={[
                          { value: "active", label: "Active" },
                          { value: "inactive", label: "Inactive" },
                          { value: "expired", label: "Expired" },
                        ]}
                        placeholder="Select Status"
                        size="small"
                      />
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
                      background: getMembershipStatusColor(
                        client.membership_status
                      ),
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {client.membership_status}
                  </div>
                  {client.membership_days_left > 0 && (
                    <div
                      style={{
                        color: textSecondary,
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      {client.membership_days_left} days left
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
                  <div style={{ textTransform: "capitalize" }}>
                    {client.membership_type
                      ? client.membership_type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                      : "None"}
                  </div>
                  {client.membership_start_date && (
                    <div
                      style={{
                        color: textSecondary,
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      {new Date(
                        client.membership_start_date
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {new Date(
                        client.membership_end_date
                      ).toLocaleDateString()}
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
                  {client.membership_fee ? `₱${client.membership_fee}` : "N/A"}
                </td>
                <td
                  style={{
                    padding: 16,
                    borderTop: `1px solid ${borderColor}`,
                    color: textPrimary,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        setRfidAssignClient(client);
                        setRfidInput(client.rfid_tag || "");
                      }}
                      style={{
                        background: client.rfid_tag ? "#6b7280" : "#3b82f6",
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      title={client.rfid_tag ? "Change RFID Tag" : "Assign RFID Tag"}
                    >
                      {client.rfid_tag ? "🔁 RFID" : "➕ RFID"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingClient(client);
                        setShowEditForm(true);
                      }}
                      style={{
                        background: "#071d63",
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      disabled={deletingClient === client.id}
                      style={{
                        background:
                          deletingClient === client.id ? "#6b7280" : "#ef4444",
                        color: "white",
                        border: 0,
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor:
                          deletingClient === client.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {deletingClient === client.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredClients.length === 0 && clients && clients.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            No clients found matching your search
          </div>
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            Try adjusting your search terms or status filter
          </div>
        </div>
      )}

      {clients && clients.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>No clients found</div>
          <div style={{ color: "#6b7280", marginTop: 8 }}>
            Click "Add Client" to create your first client
          </div>
        </div>
      )}

      {detailsClient && (
        <Modal
          title="Client Details"
          onClose={() => setDetailsClient(null)}
          maxWidth={700}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {(() => {
              const extra = getClientDetails(detailsClient);
              return (
                <>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      First Name
                    </div>
                    <div style={{ color: textPrimary, fontWeight: 700 }}>
                      {extra.first_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      Last Name
                    </div>
                    <div style={{ color: textPrimary, fontWeight: 700 }}>
                      {extra.last_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>Email</div>
                    <div style={{ color: textPrimary }}>
                      {detailsClient.email}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>Phone</div>
                    <div style={{ color: textPrimary }}>
                      {detailsClient.phone || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>Age</div>
                    <div style={{ color: textPrimary }}>{extra.age || "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      Address
                    </div>
                    <div style={{ color: textPrimary }}>
                      {extra.address || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>
                      RFID Tag
                    </div>
                    <div style={{ color: textPrimary }}>
                      {detailsClient.rfid_tag || "No RFID"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textSecondary, fontSize: 12 }}>Status</div>
                    <div
                      style={{ color: textPrimary, textTransform: "capitalize" }}
                    >
                      {detailsClient.status}
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ color: textSecondary, fontSize: 12 }}>Notes</div>
                    <div style={{ color: textPrimary }}>
                      {detailsClient.notes || "—"}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, clientId: null })}
        onConfirm={confirmDeleteClient}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonStyle="danger"
      />

      {/* RFID Assignment Modal */}
      {rfidAssignClient && (
        <Modal
          title={`Assign RFID Tag - ${rfidAssignClient.name}`}
          onClose={() => {
            setRfidAssignClient(null);
            setRfidInput("");
            setRfidInputFocused(false);
          }}
          maxWidth={600}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <p style={{ color: textSecondary, fontSize: 14, marginBottom: 16 }}>
                Scan the RFID card using the USB reader, or manually enter the RFID tag.
              </p>
              <label
                style={{
                  display: "block",
                  color: textSecondary,
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                RFID Tag *
              </label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  type="text"
                  value={rfidInput}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    setRfidInput(value);
                    
                    // Auto-process if it looks like a scanned RFID (4+ characters)
                    if (value.length >= 4) {
                      const now = Date.now();
                      if (now - lastScanTime > 500) {
                        setLastScanTime(now);
                        // Don't auto-submit, let user confirm
                      }
                    }
                  }}
                  onFocus={() => setRfidInputFocused(true)}
                  onBlur={() => {
                    setRfidInputFocused(false);
                    setTimeout(() => {
                      if (!rfidInputFocused) setRfidInput(rfidInput);
                    }, 100);
                  }}
                  placeholder={rfidInputFocused ? "Scan RFID card or type tag..." : "Click here and scan RFID card"}
                  required
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: isDark ? "#1a1a1a" : "#ffffff",
                    border: `2px solid ${rfidInputFocused ? "#3b82f6" : borderColor}`,
                    borderRadius: 8,
                    color: textPrimary,
                    fontSize: 16,
                    fontFamily: "monospace",
                    letterSpacing: "2px",
                  }}
                />
                <div
                  style={{
                    padding: "8px 16px",
                    background: rfidInputFocused ? "#3b82f6" : "#6b7280",
                    color: "#ffffff",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {rfidInputFocused ? "Ready to Scan" : "Click to Activate"}
                </div>
              </div>
              {rfidAssignClient.rfid_tag && (
                <p style={{ color: textSecondary, fontSize: 12, marginTop: 8 }}>
                  Current RFID: <strong style={{ fontFamily: "monospace" }}>{rfidAssignClient.rfid_tag}</strong>
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setRfidAssignClient(null);
                  setRfidInput("");
                  setRfidInputFocused(false);
                }}
                style={{
                  background: "#6b7280",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              {rfidAssignClient.rfid_tag && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(
                        `/api/users/${rfidAssignClient.id}/remove-rfid`,
                        {
                          method: "DELETE",
                          headers: {
                            "X-User-Email": user?.email || "",
                          },
                        }
                      );

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || "Failed to remove RFID");
                      }

                      showSuccess("RFID tag removed successfully!");
                      setRfidAssignClient(null);
                      setRfidInput("");
                      fetchClients();
                    } catch (err: any) {
                      showError(err.message || "Failed to remove RFID tag");
                    }
                  }}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: 0,
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove RFID
                </button>
              )}
              <button
                onClick={async () => {
                  if (!rfidInput.trim()) {
                    showError("Please enter or scan an RFID tag");
                    return;
                  }

                  try {
                    const response = await fetch(
                      `/api/users/${rfidAssignClient.id}/assign-rfid`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "X-User-Email": user?.email || "",
                        },
                        body: JSON.stringify({
                          rfid_tag: rfidInput.trim(),
                        }),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.message || "Failed to assign RFID");
                    }

                    showSuccess("RFID tag assigned successfully!");
                    setRfidAssignClient(null);
                    setRfidInput("");
                    fetchClients();
                  } catch (err: any) {
                    showError(err.message || "Failed to assign RFID tag");
                  }
                }}
                disabled={!rfidInput.trim()}
                style={{
                  background: rfidInput.trim() ? "#3b82f6" : "#6b7280",
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  cursor: rfidInput.trim() ? "pointer" : "not-allowed",
                }}
              >
                {rfidAssignClient.rfid_tag ? "Update RFID" : "Assign RFID"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
