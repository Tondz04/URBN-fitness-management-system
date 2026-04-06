import * as React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useNotification } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { SearchableSelect } from "../components/SearchableSelect";

interface TrackingEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  rfid_tag: string;
  timestamp: string;
  status: "granted" | "denied";
  reason?: string | null;
}

export default function Tracking() {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const isMainAdmin = user?.role === "main_admin";

  const [trackingEntries, setTrackingEntries] = React.useState<TrackingEntry[]>([]);
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [rfidInput, setRfidInput] = React.useState("");
  const [rfidInputFocused, setRfidInputFocused] = React.useState(false);
  const [lastScanTime, setLastScanTime] = React.useState(0);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [deletingEntryId, setDeletingEntryId] = React.useState<number | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = React.useState<{
    isOpen: boolean;
    entryId: number | null;
  }>({ isOpen: false, entryId: null });
  
  // Store timeout ref for debouncing
  const rfidTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Filter tracking entries based on search term
  const filteredEntries = React.useMemo(() => {
    return trackingEntries.filter((entry) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        entry.user_name?.toLowerCase().includes(searchLower) ||
        entry.rfid_tag?.toLowerCase().includes(searchLower) ||
        entry.reason?.toLowerCase().includes(searchLower) ||
        entry.status?.toLowerCase().includes(searchLower) ||
        entry.timestamp?.toLowerCase().includes(searchLower) ||
        entry.id?.toString().includes(searchLower)
      );
    });
  }, [trackingEntries, searchTerm]);

  React.useEffect(() => {
    fetchClients();
    fetchTrackingData();
    
    // Refresh tracking data every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchTrackingData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setClients(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  const fetchTrackingData = async () => {
    try {
      const url = new URL("/api/tracking", window.location.origin);
      if (searchTerm) url.searchParams.append("search", searchTerm);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setTrackingEntries(data.data || []);
        setLoading(false);
      } else {
        throw new Error("Failed to fetch tracking data");
      }
    } catch (err) {
      console.error("Failed to fetch tracking data:", err);
      setLoading(false);
    }
  };

  // Handle RFID scan input
  // Most USB RFID readers act as keyboard wedges, sending the card ID as keystrokes
  const handleRFIDInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Update input value immediately for visual feedback
    setRfidInput(value);

    // Clear any existing timeout
    if (rfidTimeoutRef.current) {
      clearTimeout(rfidTimeoutRef.current);
    }

    // Don't process empty values
    if (!value || value.trim().length === 0) return;

    const trimmedValue = value.trim();
    
    // Process if we have at least 4 characters (minimum RFID tag length)
    if (trimmedValue.length >= 4) {
      // Debounce: Wait 500ms after last keystroke before processing
      rfidTimeoutRef.current = setTimeout(async () => {
        // Only process if at least 500ms have passed since last scan
        const now = Date.now();
        if (now - lastScanTime < 500) {
          setRfidInput("");
          return;
        }
        setLastScanTime(now);

        await processRFIDScan(trimmedValue);
        // Clear input after processing
        setTimeout(() => setRfidInput(""), 200);
      }, 500); // Wait 500ms after last keystroke
    }
  };

  // Handle key press events (for Enter key or when RFID reader sends Enter)
  const handleRFIDKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && rfidInput.trim().length >= 4) {
      e.preventDefault();
      
      // Clear any pending timeout
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
        rfidTimeoutRef.current = null;
      }

      const now = Date.now();
      if (now - lastScanTime < 500) {
        setRfidInput("");
        return;
      }
      setLastScanTime(now);
      await processRFIDScan(rfidInput.trim());
      setRfidInput("");
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
      }
    };
  }, []);

  const processRFIDScan = async (rfidTag: string) => {
    if (!rfidTag || rfidTag.trim().length < 4) {
      showError("Invalid RFID tag. Please scan again.");
      return;
    }

    try {
      console.log("Processing RFID scan:", rfidTag);
      const response = await fetch("/api/rfid/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rfid_tag: rfidTag.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data && data.data.status === "granted") {
          showSuccess(data.message || "Access granted!");
        } else {
          showError(data.message || "Access denied");
        }
        
        // Refresh tracking data to show the new entry
        setTimeout(() => {
          fetchTrackingData();
          // Also trigger dashboard refresh
          window.dispatchEvent(new CustomEvent("trackingDataUpdated"));
        }, 500);
      } else {
        showError(data.message || "Failed to process RFID scan");
        console.error("RFID scan API error:", data);
      }
    } catch (err: any) {
      showError("Failed to process RFID scan. Please try again.");
      console.error("RFID scan error:", err);
    }
  };

  const handleManualEntry = async () => {
    if (!selectedUserId) return;

    const client = clients.find((c) => c.id.toString() === selectedUserId);
    if (!client) return;

    if (!client.rfid_tag) {
      showError("This customer does not have an RFID tag assigned");
      return;
    }

    await processRFIDScan(client.rfid_tag);
  };

  const clearTrackingData = async () => {
    if (!isMainAdmin) {
      showError("Only Main Admin can clear tracking data");
      return;
    }
    setConfirmClear(true);
  };

  const confirmClearData = async () => {
    try {
      const response = await fetch("/api/tracking/clear", {
        method: "DELETE",
        headers: {
          "X-User-Email": user?.email || "",
        },
      });

      if (response.ok) {
        showSuccess("Tracking data cleared successfully!");
        setTrackingEntries([]);
        setConfirmClear(false);
      } else {
        const data = await response.json();
        showError(data.message || "Failed to clear tracking data");
      }
    } catch (err) {
      showError("Failed to clear tracking data");
    }
  };

  const handleDeleteEntry = async () => {
    if (!confirmDeleteEntry.entryId) return;

    try {
      setDeletingEntryId(confirmDeleteEntry.entryId);
      const response = await fetch(`/api/tracking/${confirmDeleteEntry.entryId}`, {
        method: "DELETE",
        headers: {
          "X-User-Email": user?.email || "",
        },
      });

      if (response.ok) {
        showSuccess("Access log deleted successfully!");
        setTrackingEntries((prev) =>
          prev.filter((entry) => entry.id !== confirmDeleteEntry.entryId)
        );
        setConfirmDeleteEntry({ isOpen: false, entryId: null });
      } else {
        const data = await response.json();
        showError(data.message || "Failed to delete access log");
      }
    } catch (err) {
      showError("Failed to delete access log");
    } finally {
      setDeletingEntryId(null);
    }
  };

  const getStatusColor = (status: string) => {
    return status === "granted" ? "#10b981" : "#ef4444";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  if (loading && trackingEntries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: textSecondary }}>
          Loading tracking data...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>
          Gym Access Tracking
        </h2>
        {isMainAdmin && (
          <button
            onClick={clearTrackingData}
            style={{
              background: "#6b7280",
              color: "#ffffff",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear Data
          </button>
        )}
      </div>

      {/* RFID Scanner Input */}
      <div
        style={{
          background: bgSecondary,
          padding: 20,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginBottom: 16, color: textPrimary }}>
          RFID Scanner
        </h3>
        <p style={{ marginBottom: 16, color: textSecondary, fontSize: 14 }}>
          Scan an RFID card using the USB reader. The card ID will be automatically detected.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
              <input
                type="text"
                value={rfidInput}
                onChange={handleRFIDInput}
                onKeyPress={handleRFIDKeyPress}
                onFocus={() => setRfidInputFocused(true)}
                onBlur={() => {
                  setRfidInputFocused(false);
                  // Don't clear immediately on blur - allow time for processing
                }}
                placeholder={rfidInputFocused ? "Scan RFID card..." : "Click here and scan RFID card"}
                autoFocus={false}
                autoComplete="off"
                style={{
                  width: "100%",
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
          </div>
          <div
            style={{
              padding: "8px 16px",
              background: rfidInputFocused ? "#3b82f6" : "#6b7280",
              color: "#ffffff",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {rfidInputFocused ? "Ready to Scan" : "Click to Activate"}
          </div>
        </div>
      </div>

      {/* Manual Entry Controls */}
      <div
        style={{
          background: bgSecondary,
          padding: 20,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginBottom: 16, color: textPrimary }}>
          Manual Entry Controls
        </h3>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr auto" }}>
          <div>
            <label
              style={{
                display: "block",
                color: textSecondary,
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Select Customer (Manual Entry)
            </label>
            <SearchableSelect
              value={selectedUserId}
              onChange={(value) => setSelectedUserId(value.toString())}
              options={clients
                .filter((c) => c.rfid_tag)
                .map((client) => ({
                  value: client.id,
                  label: client.name,
                  subtitle: client.rfid_tag,
                }))}
              placeholder="Select a customer for manual entry"
              searchPlaceholder="Search customers by name or RFID tag..."
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={handleManualEntry}
              disabled={!selectedUserId}
              style={{
                background: selectedUserId ? "#3b82f6" : "#6b7280",
                color: "#ffffff",
                border: 0,
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: selectedUserId ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              Record Manual Entry
            </button>
          </div>
        </div>
      </div>

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
            placeholder="Search access logs by customer name, RFID tag, status, reason, timestamp, or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // Debounce search
              setTimeout(() => fetchTrackingData(), 500);
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: isDark ? "#1a1a1a" : "#ffffff",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              color: textPrimary,
              fontSize: 14,
            }}
          />
        </div>
        {searchTerm && (
          <div
            style={{
              color: textSecondary,
              fontSize: 14,
              whiteSpace: "nowrap",
              marginLeft: 20,
            }}
          >
            {filteredEntries.length} entr
            {filteredEntries.length !== 1 ? "ies" : "y"} found
          </div>
        )}
      </div>

      {/* Tracking Entries Table */}
      <div
        style={{
          background: bgSecondary,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}` }}>
          <h3 style={{ color: textPrimary, margin: 0 }}>
            Access Log ({trackingEntries.length} total entries)
          </h3>
        </div>

        {filteredEntries.length === 0 && trackingEntries.length > 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 18, color: textSecondary }}>
              No access logs found matching your search
            </div>
            <div style={{ color: "#6b7280", marginTop: 8 }}>
              Try adjusting your search terms
            </div>
          </div>
        ) : trackingEntries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 18, color: textSecondary }}>
              No tracking entries yet
            </div>
            <div style={{ color: "#6b7280", marginTop: 8 }}>
              Scan an RFID card or use manual entry to record access logs
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
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
                    position: "sticky",
                    top: 0,
                  }}
                >
                  <th style={{ padding: 16 }}>Customer</th>
                  <th style={{ padding: 16 }}>RFID Tag</th>
                  <th style={{ padding: 16 }}>Date</th>
                  <th style={{ padding: 16 }}>Time</th>
                  <th style={{ padding: 16 }}>Status</th>
                  <th style={{ padding: 16 }}>Reason</th>
                  {isMainAdmin && <th style={{ padding: 16 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => {
                  const { date, time } = formatTimestamp(entry.timestamp);
                  return (
                    <tr
                      key={entry.id}
                      style={{
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
                          borderTop: `1px solid ${borderColor}`,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {entry.user_name || "Unknown"}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: `1px solid ${borderColor}`,
                        }}
                      >
                        <div
                          style={{
                            background: isDark ? "#1a1a1a" : "#f3f4f6",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: "monospace",
                          }}
                        >
                          {entry.rfid_tag}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: `1px solid ${borderColor}`,
                        }}
                      >
                        {date}
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: `1px solid ${borderColor}`,
                        }}
                      >
                        {time}
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: `1px solid ${borderColor}`,
                        }}
                      >
                        <div
                          style={{
                            background: getStatusColor(entry.status),
                            color: "#ffffff",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {entry.status}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: `1px solid ${borderColor}`,
                        }}
                      >
                        <div style={{ color: textSecondary, fontSize: 12 }}>
                          {entry.reason || "N/A"}
                        </div>
                      </td>
                      {isMainAdmin && (
                        <td
                          style={{
                            padding: 16,
                            borderTop: `1px solid ${borderColor}`,
                          }}
                        >
                          <button
                            onClick={() =>
                              setConfirmDeleteEntry({ isOpen: true, entryId: entry.id })
                            }
                            disabled={deletingEntryId === entry.id}
                            style={{
                              background:
                                deletingEntryId === entry.id ? "#6b7280" : "#ef4444",
                              color: "white",
                              border: 0,
                              borderRadius: 6,
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor:
                                deletingEntryId === entry.id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {deletingEntryId === entry.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clear All */}
      <ConfirmationModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={confirmClearData}
        title="Clear Tracking Data"
        message="Are you sure you want to clear all tracking data? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        confirmButtonStyle="danger"
      />

      {/* Confirmation Modal for Delete Single Entry */}
      <ConfirmationModal
        isOpen={confirmDeleteEntry.isOpen}
        onClose={() => setConfirmDeleteEntry({ isOpen: false, entryId: null })}
        onConfirm={handleDeleteEntry}
        title="Delete Access Log"
        message="Are you sure you want to delete this access log? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonStyle="danger"
      />
    </div>
  );
}
