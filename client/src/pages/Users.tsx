import * as React from "react";
import { Modal } from "../components/Modal";

export default function Clients() {
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

  // Filter clients based on search term
  const filteredClients = React.useMemo(() => {
    if (!clients) return [];

    return clients.filter((client) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        client.name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.toLowerCase().includes(searchLower) ||
        client.address?.toLowerCase().includes(searchLower) ||
        client.rfid_tag?.toLowerCase().includes(searchLower) ||
        client.age?.toString().includes(searchLower) ||
        client.status?.toLowerCase().includes(searchLower) ||
        client.notes?.toLowerCase().includes(searchLower)
      );
    });
  }, [clients, searchTerm]);

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

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
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
  };

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
      last_name: client.name?.split(" ").slice(1).join(" ") || "User",
      age: Math.floor(18 + Math.random() * 22),
      address: "Iloilo City, Philippines",
    };
    saveExtraDetails(client.email, placeholder);
    return placeholder;
  };

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
      fetchClients();
      alert("Client created successfully!");
    } catch (err: any) {
      console.error("Failed to create client:", err);
      alert("Failed to create client: " + err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

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
      fetchClients();
      alert("Client updated successfully!");
    } catch (err: any) {
      console.error("Failed to update client:", err);
      alert("Failed to update client: " + err.message);
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this client? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingClient(clientId);
      const response = await fetch(`/api/users/${clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete client");
      }

      fetchClients();
      alert("Client deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete client:", err);
      alert("Failed to delete client: " + err.message);
    } finally {
      setDeletingClient(null);
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

      await fetchUsers();
    } catch (err: any) {
      console.error("Failed to update user status:", err);
      alert("Failed to update user status: " + err.message);
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
        <div style={{ fontSize: 18, color: "#9ca3af" }}>Loading users...</div>
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
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) =>
                  handleInputChange("first_name", e.target.value)
                }
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter first name"
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
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter last name"
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
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter email address"
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
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter phone number"
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
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
                  color: "#9ca3af",
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
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
                  color: "#9ca3af",
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
                    background: "#1a1a1a",
                    border: "1px solid #374151",
                    color: "#9ca3af",
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
                  color: "#6b7280",
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
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  handleInputChange("first_name", e.target.value)
                }
                required
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
                placeholder="Enter first name"
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
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                required
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
                placeholder="Enter last name"
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
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
                placeholder="Enter email"
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
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  padding: "12px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
                placeholder="Enter phone number"
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
                placeholder="Enter age"
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
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
                placeholder="Enter address"
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
                    background: "#1a1a1a",
                    border: "1px solid #374151",
                    color: "#9ca3af",
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
                  color: "#6b7280",
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
                  color: "#9ca3af",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "250px",
                  background: "#1a1a1a",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
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
            placeholder="Search clients by name, email, phone, address, RFID tag, age, status, or notes..."
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
            {filteredClients.length} client
            {filteredClients.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      {/* Clients Table */}
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
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div>
                    <button
                      onClick={() => setDetailsClient(client)}
                      style={{
                        background: "transparent",
                        color: "#ffffff",
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
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {client.email}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {client.phone}
                    </div>
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div
                    style={{
                      background: "#1a1a1a",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {client.rfid_tag || "No RFID"}
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
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
                    <select
                      value={client.status}
                      onChange={(e) =>
                        handleUpdateStatus(client.id, e.target.value)
                      }
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid #374151",
                        color: "white",
                        padding: "6px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
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
                      style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}
                    >
                      {client.membership_days_left} days left
                    </div>
                  )}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div style={{ textTransform: "capitalize" }}>
                    {client.membership_type
                      ? client.membership_type.replace("_", " ")
                      : "None"}
                  </div>
                  {client.membership_start_date && (
                    <div
                      style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}
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
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  {client.membership_fee ? `₱${client.membership_fee}` : "N/A"}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div style={{ display: "flex", gap: 8 }}>
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
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      First Name
                    </div>
                    <div style={{ color: "#e5e7eb", fontWeight: 700 }}>
                      {extra.first_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      Last Name
                    </div>
                    <div style={{ color: "#e5e7eb", fontWeight: 700 }}>
                      {extra.last_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Email</div>
                    <div style={{ color: "#e5e7eb" }}>
                      {detailsClient.email}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Phone</div>
                    <div style={{ color: "#e5e7eb" }}>
                      {detailsClient.phone || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Age</div>
                    <div style={{ color: "#e5e7eb" }}>{extra.age || "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      Address
                    </div>
                    <div style={{ color: "#e5e7eb" }}>
                      {extra.address || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      RFID Tag
                    </div>
                    <div style={{ color: "#e5e7eb" }}>
                      {detailsClient.rfid_tag || "No RFID"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Status</div>
                    <div
                      style={{ color: "#e5e7eb", textTransform: "capitalize" }}
                    >
                      {detailsClient.status}
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Notes</div>
                    <div style={{ color: "#e5e7eb" }}>
                      {detailsClient.notes || "—"}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}
