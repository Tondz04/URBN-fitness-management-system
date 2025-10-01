import * as React from "react";

interface TrackingEntry {
  id: number;
  user_id: number;
  user_name: string;
  rfid_tag: string;
  timestamp: string;
  status: "granted" | "denied";
  reason?: string;
}

export default function Tracking() {
  const [trackingEntries, setTrackingEntries] = React.useState<TrackingEntry[]>(
    []
  );
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [simulationMode, setSimulationMode] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [simulationSpeed, setSimulationSpeed] = React.useState(2000); // milliseconds
  const [simulationInterval, setSimulationInterval] =
    React.useState<NodeJS.Timeout | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

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
    loadTrackingData();
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
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingData = () => {
    try {
      const stored = localStorage.getItem("trackingEntries");
      if (stored) {
        setTrackingEntries(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load tracking data:", err);
    }
  };

  const saveTrackingData = (entries: TrackingEntry[]) => {
    localStorage.setItem("trackingEntries", JSON.stringify(entries));
    setTrackingEntries(entries);
    // Dispatch custom event to notify dashboard of updates
    window.dispatchEvent(new CustomEvent("trackingDataUpdated"));
  };

  const simulateRFIDAccess = (client: any) => {
    const now = new Date();
    const entry: TrackingEntry = {
      id: Date.now(),
      user_id: client.id,
      user_name: client.name,
      rfid_tag: client.rfid_tag || "NO_RFID",
      timestamp: now.toISOString(),
      status: "denied",
      reason: "No RFID assigned",
    };

    // Check if client has RFID
    if (!client.rfid_tag) {
      entry.reason = "No RFID assigned";
    }
    // Check if client is active
    else if (client.status !== "active") {
      entry.reason = "Account inactive";
    }
    // Check if membership is valid
    else if (client.membership_status === "Expired") {
      entry.reason = "Membership expired";
    }
    // Check if membership is expiring soon (within 7 days)
    else if (client.membership_status === "Expiring Soon") {
      entry.reason = "Membership expiring soon";
    }
    // Check if membership days left is 0 or negative
    else if (client.membership_days_left <= 0) {
      entry.reason = "Membership expired";
    }
    // All checks passed
    else {
      entry.status = "granted";
      entry.reason = "Access granted";
    }

    const newEntries = [entry, ...trackingEntries];
    saveTrackingData(newEntries);
    return entry;
  };

  const handleManualSimulation = () => {
    if (!selectedUserId) return;

    const client = clients.find((c) => c.id.toString() === selectedUserId);
    if (client) {
      simulateRFIDAccess(client);
    }
  };

  const startAutoSimulation = () => {
    if (simulationInterval) return;

    const interval = setInterval(() => {
      if (clients.length > 0) {
        const randomClient =
          clients[Math.floor(Math.random() * clients.length)];
        simulateRFIDAccess(randomClient);
      }
    }, simulationSpeed);

    setSimulationInterval(interval);
    setSimulationMode(true);
  };

  const stopAutoSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    setSimulationMode(false);
  };

  const clearTrackingData = () => {
    if (
      confirm(
        "Are you sure you want to clear all tracking data? This cannot be undone."
      )
    ) {
      saveTrackingData([]);
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#9ca3af" }}>
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
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Gym Access Tracking</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={clearTrackingData}
            style={{
              background: "#6b7280",
              color: "white",
              border: 0,
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear Data
          </button>
          {!simulationMode ? (
            <button
              onClick={startAutoSimulation}
              style={{
                background: "#057a1a",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Start Auto Simulation
            </button>
          ) : (
            <button
              onClick={stopAutoSimulation}
              style={{
                background: "#8a0707",
                color: "white",
                border: 0,
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Stop Simulation
            </button>
          )}
        </div>
      </div>

      {/* Simulation Controls */}
      <div
        style={{
          background: "#000000",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #374151",
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginBottom: 16, color: "#e5e7eb" }}>
          RFID Simulation Controls
        </h3>

        <div
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
              Manual Simulation - Select User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{
                width: "100%",
                background: "#1a1a1a",
                border: "1px solid #374151",
                color: "white",
                padding: "8px 12px",
                borderRadius: 6,
              }}
            >
              <option value="">Select a client to simulate RFID tap</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.rfid_tag || "No RFID"})
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
              Auto Simulation Speed (ms)
            </label>
            <input
              type="number"
              min="1000"
              max="10000"
              step="500"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              disabled={simulationMode}
              style={{
                width: "100%",
                background: "#1a1a1a",
                border: "1px solid #374151",
                color: "white",
                padding: "8px 12px",
                borderRadius: 6,
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button
            onClick={handleManualSimulation}
            disabled={!selectedUserId}
            style={{
              background: selectedUserId ? "#3b82f6" : "#6b7280",
              color: "white",
              border: 0,
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: selectedUserId ? "pointer" : "not-allowed",
            }}
          >
            Simulate RFID Tap
          </button>
        </div>
      </div>

      {/* Tracking Entries Table */}
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
            placeholder="Search access logs by user name, RFID tag, status, reason, timestamp, or ID..."
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
            {filteredEntries.length} entr
            {filteredEntries.length !== 1 ? "ies" : "y"} found
          </div>
        )}
      </div>

      <div
        style={{
          background: "#000000",
          borderRadius: 12,
          border: "1px solid #1f2937",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #1f2937" }}>
          <h3 style={{ color: "#e5e7eb", margin: 0 }}>
            Access Log ({trackingEntries.length} total entries)
          </h3>
        </div>

        {filteredEntries.length === 0 && trackingEntries.length > 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 18, color: "#9ca3af" }}>
              No access logs found matching your search
            </div>
            <div style={{ color: "#6b7280", marginTop: 8 }}>
              Try adjusting your search terms or status filter
            </div>
          </div>
        ) : trackingEntries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 18, color: "#9ca3af" }}>
              No tracking entries yet
            </div>
            <div style={{ color: "#6b7280", marginTop: 8 }}>
              Use the simulation controls above to generate access logs
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
                    color: "#9ca3af",
                    textAlign: "left",
                    background: "#1a1a1a",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  <th style={{ padding: 16 }}>User</th>
                  <th style={{ padding: 16 }}>RFID Tag</th>
                  <th style={{ padding: 16 }}>Date</th>
                  <th style={{ padding: 16 }}>Time</th>
                  <th style={{ padding: 16 }}>Status</th>
                  <th style={{ padding: 16 }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const { date, time } = formatTimestamp(entry.timestamp);
                  return (
                    <tr key={entry.id}>
                      <td
                        style={{
                          padding: 16,
                          borderTop: "1px solid #1f2937",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{entry.user_name}</div>
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: "1px solid #1f2937",
                        }}
                      >
                        <div
                          style={{
                            background: "#1a1a1a",
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
                          borderTop: "1px solid #1f2937",
                        }}
                      >
                        {date}
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: "1px solid #1f2937",
                        }}
                      >
                        {time}
                      </td>
                      <td
                        style={{
                          padding: 16,
                          borderTop: "1px solid #1f2937",
                        }}
                      >
                        <div
                          style={{
                            background: getStatusColor(entry.status),
                            color: "white",
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
                          borderTop: "1px solid #1f2937",
                        }}
                      >
                        <div style={{ color: "#9ca3af", fontSize: 12 }}>
                          {entry.reason}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
