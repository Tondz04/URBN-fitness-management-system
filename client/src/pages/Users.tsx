import * as React from "react";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";

export default function Users() {
  const [users, setUsers] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [deletingUser, setDeletingUser] = React.useState<number | null>(null);
  const [detailsUser, setDetailsUser] = React.useState<any | null>(null);

  // Form state for adding new user
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
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setUsers(data.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message || "Failed to load users");
      setUsers(null);
    } finally {
      setLoading(false);
    }
  };

  // Local storage helpers for extra user details
  const loadExtraDetails = (): Record<string, any> => {
    try {
      const raw = localStorage.getItem("userExtraDetails");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveExtraDetails = (email: string, details: any) => {
    const map = loadExtraDetails();
    map[email] = { ...map[email], ...details };
    localStorage.setItem("userExtraDetails", JSON.stringify(map));
  };

  const getUserDetails = (user: any) => {
    const map = loadExtraDetails();
    const existing = map[user.email];
    if (existing) return existing;
    const placeholder = {
      first_name: user.name?.split(" ")[0] || "Guest",
      last_name: user.name?.split(" ").slice(1).join(" ") || "User",
      age: Math.floor(18 + Math.random() * 22),
      address: "Iloilo City, Philippines",
    };
    saveExtraDetails(user.email, placeholder);
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
        throw new Error(errorData.message || "Failed to create user");
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
        rfid_tag: "",
        status: "active",
        notes: "",
      });
      setShowAddForm(false);
      fetchUsers();
      alert("User created successfully!");
    } catch (err: any) {
      console.error("Failed to create user:", err);
      alert("Failed to create user: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingUser(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }

      fetchUsers();
      alert("User deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user: " + err.message);
    } finally {
      setDeletingUser(null);
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
      <Layout>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>Loading users...</div>
        </div>
      </Layout>
    );
  }

  if (error || !users) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 16 }}>
            Failed to load users
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
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Users & Memberships</h2>
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
          {showAddForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {/* Add User Modal */}
      {showAddForm && (
        <Modal title="Add New User" onClose={() => setShowAddForm(false)}>
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
                  background: "#1f2937",
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
                  background: "#1f2937",
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
                  background: "#1f2937",
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
                  background: "#1f2937",
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
                  background: "#1f2937",
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
                  background: "#1f2937",
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
                RFID Tag
              </label>
              <input
                type="text"
                value={formData.rfid_tag}
                onChange={(e) => handleInputChange("rfid_tag", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                placeholder="Enter RFID tag (optional)"
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
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                style={{
                  width: "100%",
                  background: "#1f2937",
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
                placeholder="Optional notes about this user..."
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
                Create User
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Users Table */}
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
              <th style={{ padding: 16 }}>User</th>
              <th style={{ padding: 16 }}>RFID Tag</th>
              <th style={{ padding: 16 }}>Status</th>
              <th style={{ padding: 16 }}>Membership</th>
              <th style={{ padding: 16 }}>Type</th>
              <th style={{ padding: 16 }}>Fee</th>
              <th style={{ padding: 16 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div>
                    <button
                      onClick={() => setDetailsUser(user)}
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
                      {user.name}
                    </button>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {user.email}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {user.phone}
                    </div>
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div
                    style={{
                      background: "#1f2937",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  >
                    {user.rfid_tag || "No RFID"}
                  </div>
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        background: getStatusColor(user.status),
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {user.status}
                    </div>
                    <select
                      value={user.status}
                      onChange={(e) =>
                        handleUpdateStatus(user.id, e.target.value)
                      }
                      style={{
                        background: "#1f2937",
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
                        user.membership_status
                      ),
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {user.membership_status}
                  </div>
                  {user.membership_days_left > 0 && (
                    <div
                      style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}
                    >
                      {user.membership_days_left} days left
                    </div>
                  )}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <div style={{ textTransform: "capitalize" }}>
                    {user.membership_type
                      ? user.membership_type.replace("_", " ")
                      : "None"}
                  </div>
                  {user.membership_start_date && (
                    <div
                      style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}
                    >
                      {new Date(
                        user.membership_start_date
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {new Date(user.membership_end_date).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  {user.membership_fee ? `₱${user.membership_fee}` : "N/A"}
                </td>
                <td style={{ padding: 16, borderTop: "1px solid #1f2937" }}>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={deletingUser === user.id}
                    style={{
                      background:
                        deletingUser === user.id ? "#6b7280" : "#ef4444",
                      color: "white",
                      border: 0,
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor:
                        deletingUser === user.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {deletingUser === user.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detailsUser && (
        <Modal
          title="User Details"
          onClose={() => setDetailsUser(null)}
          maxWidth={600}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {(() => {
              const extra = getUserDetails(detailsUser);
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
                    <div style={{ color: "#e5e7eb" }}>{detailsUser.email}</div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Phone</div>
                    <div style={{ color: "#e5e7eb" }}>
                      {detailsUser.phone || "—"}
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
                      {detailsUser.rfid_tag || "No RFID"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Status</div>
                    <div
                      style={{ color: "#e5e7eb", textTransform: "capitalize" }}
                    >
                      {detailsUser.status}
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Notes</div>
                    <div style={{ color: "#e5e7eb" }}>
                      {detailsUser.notes || "—"}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}
    </Layout>
  );
}
