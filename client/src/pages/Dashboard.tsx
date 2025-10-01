import * as React from "react";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "#000000",
        padding: 20,
        borderRadius: 14,
        border: "1px solid #1f2937",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ color: "#cbd5e1", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [products, setProducts] = React.useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = React.useState<any[]>([]);

  const fetchProducts = React.useCallback(async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  const fetchRecentAttendance = React.useCallback(async () => {
    try {
      // First try to get from localStorage (current tracking implementation)
      const stored = localStorage.getItem("trackingEntries");
      if (stored) {
        const trackingData = JSON.parse(stored);
        // Get the last 5 attendance records and format them for display
        const recent = trackingData.slice(0, 5).map((entry: any) => ({
          id: entry.id,
          clientName: entry.user_name,
          time: new Date(entry.timestamp).toLocaleTimeString(),
          date: new Date(entry.timestamp).toLocaleDateString(),
          status: entry.status === "granted" ? "Granted" : "Denied",
          reason: entry.reason,
        }));
        setRecentAttendance(recent);
        return;
      }

      // Fallback to API if localStorage is empty
      const response = await fetch("/api/tracking");
      if (response.ok) {
        const data = await response.json();
        // Get the last 5 attendance records
        const recent = (data.data || []).slice(0, 5);
        setRecentAttendance(recent);
      }
    } catch (err) {
      console.error("Failed to fetch recent attendance:", err);
    }
  }, []);

  // Intelligent low stock detection based on product type and typical usage
  const getLowStockProducts = React.useCallback(() => {
    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const stock = product.stock || 0;

      // Define low stock thresholds based on product type
      if (name.includes("whey") || name.includes("protein")) {
        // Protein powders: low if below 8 servings
        return stock < 8;
      } else if (name.includes("creatine") || name.includes("pre-workout")) {
        // Supplements: low if below 5 servings
        return stock < 5;
      } else if (name.includes("shaker") || name.includes("bottle")) {
        // Accessories: low if below 3 units
        return stock < 3;
      } else if (name.includes("tub") || name.includes("container")) {
        // Large containers: low if below 2 units
        return stock < 2;
      } else if (name.includes("bar") || name.includes("snack")) {
        // Individual items: low if below 10 units
        return stock < 10;
      } else {
        // Default: low if below 5 units
        return stock < 5;
      }
    });
  }, [products]);

  const fetchMetrics = React.useCallback((date: Date) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    setLoading(true);
    setError(null);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const url = `/api/metrics?year=${year}&month=${month}`;

    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setMetrics(data);
        setError(null);
      })
      .catch((err) => {
        const message = String(err?.message || "").toLowerCase();
        const isAborted =
          err?.name === "AbortError" || message.includes("aborted");
        if (isAborted) return; // Ignore aborts (navigation/unmount/timeouts)
        console.error("Failed to fetch metrics:", err);
        setError(err.message || "Failed to load dashboard data");
        setMetrics(null);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  React.useEffect(() => {
    fetchMetrics(selectedDate);
    fetchProducts();
    fetchRecentAttendance();
  }, [selectedDate, fetchMetrics, fetchProducts, fetchRecentAttendance]);

  // Refresh products every 30 seconds to keep stock levels updated
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts();
      fetchRecentAttendance();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchProducts, fetchRecentAttendance]);

  // Listen for localStorage changes to update attendance in real-time
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "trackingEntries") {
        fetchRecentAttendance();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      fetchRecentAttendance();
    };

    window.addEventListener("trackingDataUpdated", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "trackingDataUpdated",
        handleCustomStorageChange
      );
    };
  }, [fetchRecentAttendance]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#9ca3af" }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 16 }}>
          Failed to load dashboard data
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

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  };

  const lowStockProducts = getLowStockProducts();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 16 }}>
        Admin Dashboard
      </h2>

      {/* Month Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
        }}
      >
        <button
          onClick={() => navigateMonth("prev")}
          style={{
            background: "transparent",
            border: "1px solid #4b5563",
            color: "#e5e7eb",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 16 }}>←</span>
          Previous
        </button>

        <div
          style={{
            margin: "0 24px",
            textAlign: "center",
            minWidth: 200,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: 4,
            }}
          >
            {formatMonthYear(selectedDate)}
          </div>
          {isCurrentMonth() && (
            <div
              style={{
                fontSize: 12,
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              Current Month
            </div>
          )}
        </div>

        <button
          onClick={() => navigateMonth("next")}
          disabled={isCurrentMonth()}
          style={{
            background: isCurrentMonth() ? "#374151" : "transparent",
            border: "1px solid #4b5563",
            color: isCurrentMonth() ? "#6b7280" : "#e5e7eb",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: isCurrentMonth() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Next
          <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <Stat label="Total Users" value={metrics.totalUsers} />
        <Stat label="Active Members" value={metrics.activeMembers} />
        <Stat
          label="Monthly Revenue"
          value={`₱${metrics.monthlyRevenue.toLocaleString()}`}
        />
        <Stat label="New Signups" value={metrics.newSignups} />
      </div>
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#000000",
            borderRadius: 14,
            border: "1px solid #1f2937",
            padding: 16,
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              color: "#e5e7eb",
              fontWeight: 700,
            }}
          >
            <span>Revenue Trend</span>
          </div>
          <TrendChart
            data={(metrics.charts?.line ?? []).map((d: any) => d.y)}
          />
        </div>
        <div
          style={{
            background: "#000000",
            borderRadius: 14,
            border: "1px solid #1f2937",
            padding: 16,
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
              color: "#e5e7eb",
              fontWeight: 700,
            }}
          >
            <span>Revenue Breakdown</span>
          </div>
          <DonutChart
            data={(metrics.charts?.pie ?? []).map((d: any) => d.value)}
          />
        </div>
      </div>

      {/* Bottom Section - Low Stock Alert and Attendance */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <div
            style={{
              background: "#000000",
              border: "1px solid #f59e0b",
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
              flex: 1,
              maxWidth: "calc(50% - 8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 18 }}>⚠️</span>
              <h3
                style={{
                  color: "#f59e0b",
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Low Stock Alert ({lowStockProducts.length} items)
              </h3>
            </div>
            <div
              style={{
                background: "#1a1a1a",
                border: "1px solid #4b5563",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {lowStockProducts.map((product, index) => (
                  <div
                    key={product.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: index % 2 === 0 ? "#2d3748" : "transparent",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          color: "#e5e7eb",
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                      >
                        {product.name}
                      </div>
                      <div
                        style={{
                          color: "#9ca3af",
                          fontSize: 12,
                        }}
                      >
                        ₱{product.price?.toLocaleString() || "0"}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#f59e0b",
                        fontSize: 13,
                        fontWeight: 600,
                        background: "#f59e0b20",
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #f59e0b40",
                      }}
                    >
                      Only {product.stock} left
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Attendance Alert */}
        <div
          style={{
            background: "#000000",
            border: "1px solid #10b981",
            borderRadius: 8,
            padding: 16,
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
            flex: 1,
            maxWidth: "calc(50% - 8px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 18 }}>👥</span>
            <h3
              style={{
                color: "#10b981",
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Recent Attendance
            </h3>
          </div>
          <div
            style={{
              background: "#000000",
              border: "1px solid #4b5563",
              borderRadius: 6,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {recentAttendance.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: index % 2 === 0 ? "#2d3748" : "transparent",
                    borderRadius: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        color: "#e5e7eb",
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {entry.clientName}
                    </div>
                    <div
                      style={{
                        color: "#9ca3af",
                        fontSize: 12,
                      }}
                    >
                      {entry.time} • {entry.date}
                    </div>
                  </div>
                  <div
                    style={{
                      color: entry.status === "Granted" ? "#10b981" : "#ef4444",
                      fontSize: 13,
                      fontWeight: 600,
                      background:
                        entry.status === "Granted" ? "#10b98120" : "#ef444420",
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: `1px solid ${
                        entry.status === "Granted" ? "#10b98140" : "#ef444440"
                      }`,
                    }}
                  >
                    {entry.status}
                  </div>
                </div>
              ))}
              {recentAttendance.length === 0 && (
                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: 14,
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  No recent attendance records
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Very small inline SVG charts for the prototype
function TrendChart({ data }: { data: number[] }) {
  const width = 700;
  const height = 200;
  const padding = 10;
  const values = data.length ? data : [0];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const stepX = (width - padding * 2) / Math.max(1, values.length - 1);
  const points = values.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + (height - padding * 2) * (1 - (v - min) / range);
    return `${x},${y}`;
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      style={{ borderRadius: 8 }}
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="#a7c5ff"
        strokeWidth="2.5"
        points={points.join(" ")}
      />
      <polygon
        points={`${points.join(" ")} ${width - padding},${
          height - padding
        } ${padding},${height - padding}`}
        fill="url(#lg)"
      />
    </svg>
  );
}

function DonutChart({ data }: { data: number[] }) {
  const values = data.length ? data : [1];
  const total = values.reduce((a, b) => a + b, 0);
  const radius = 60;
  const cx = 100;
  const cy = 90;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"]; // limited palette
  return (
    <svg viewBox="0 0 200 180" width="100%" height={180}>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="#0f1625"
        stroke="#162033"
        strokeWidth="16"
      />
      {values.map((v, i) => {
        const len = (v / total) * circumference;
        const circle = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="transparent"
            stroke={colors[i % colors.length]}
            strokeWidth="16"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return circle;
      })}
    </svg>
  );
}
