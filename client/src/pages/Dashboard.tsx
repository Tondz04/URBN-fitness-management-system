import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

function Stat({ label, value }: { label: string; value: string | number }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6"; // Dark black / Light gray for cards
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db"; // Dark gray border / Darker border for visibility
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div
      style={{
        background: bgSecondary,
        padding: 20,
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ color: textSecondary, fontSize: 14, fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          marginTop: 6,
          color: textPrimary,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const isMainAdmin = user?.role === "main_admin";
  const isStaff = user?.role === "staff";

  const [metrics, setMetrics] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [products, setProducts] = React.useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = React.useState<any[]>([]);

  // Define theme colors early for use in error/loading states
  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6"; // Light gray for cards
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db"; // Darker border for visibility

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
      // Fetch from API (database)
      const response = await fetch("/api/tracking?limit=5");
      if (response.ok) {
        const data = await response.json();
        // Get the last 5 attendance records and format them for display
        const recent = (data.data || []).slice(0, 5).map((entry: any) => ({
          id: entry.id,
          clientName: entry.user_name || "Unknown",
          time: new Date(entry.timestamp).toLocaleTimeString(),
          date: new Date(entry.timestamp).toLocaleDateString(),
          status: entry.status === "granted" ? "Granted" : "Denied",
          reason: entry.reason || "N/A",
        }));
        setRecentAttendance(recent);
      } else {
        console.error("Failed to fetch recent attendance:", response.statusText);
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

  const fetchMetrics = React.useCallback(
    (date: Date) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      setLoading(true);
      setError(null);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const url = `/api/metrics?year=${year}&month=${month}`;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (user?.email) {
        headers["X-User-Email"] = user.email;
      }

      fetch(url, {
        signal: controller.signal,
        headers,
      })
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
    },
    [user]
  );

  React.useEffect(() => {
    fetchMetrics(selectedDate);
    fetchProducts();
    fetchRecentAttendance();
  }, [selectedDate, fetchMetrics, fetchProducts, fetchRecentAttendance]);

  // Listen for tracking data updates and refresh attendance
  React.useEffect(() => {
    const handleTrackingUpdate = () => {
      fetchRecentAttendance();
    };
    window.addEventListener("trackingDataUpdated", handleTrackingUpdate);
    return () => {
      window.removeEventListener("trackingDataUpdated", handleTrackingUpdate);
    };
  }, [fetchRecentAttendance]);

  // Refresh products every 30 seconds to keep stock levels updated
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts();
      fetchRecentAttendance();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchProducts, fetchRecentAttendance]);

  // Listen for tracking data updates and refresh attendance
  React.useEffect(() => {
    const handleTrackingUpdate = () => {
      fetchRecentAttendance();
    };

    window.addEventListener("trackingDataUpdated", handleTrackingUpdate);

    return () => {
      window.removeEventListener("trackingDataUpdated", handleTrackingUpdate);
    };
  }, [fetchRecentAttendance]);

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: textPrimary,
        }}
      >
        <div style={{ fontSize: 18, color: textSecondary }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: textPrimary,
        }}
      >
        <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 16 }}>
          Failed to load dashboard data
        </div>
        <div style={{ color: textSecondary, marginBottom: 20 }}>
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

  // Safety check - if metrics is null, show loading state
  if (!metrics) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: textPrimary,
        }}
      >
        <div style={{ fontSize: 18, color: textSecondary }}>
          Loading dashboard...
        </div>
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

  const accentColor = isDark ? "#ffffff" : "#3b82f6"; // White accent in dark mode, blue in light mode

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2
        style={{
          fontSize: 32,
          fontWeight: 900,
          marginBottom: 20,
          color: textPrimary,
        }}
      >
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
            border: `1px solid ${borderColor}`,
            color: textPrimary,
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
            onClick={() => {
              if (isMainAdmin) {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth() + 1;
                navigate(`/revenue-reports?year=${year}&month=${month}`);
              }
            }}
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: textPrimary,
              marginBottom: 4,
              cursor: isMainAdmin ? "pointer" : "default",
              textDecoration: isMainAdmin ? "underline" : "none",
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
          {isMainAdmin && (
            <div
              onClick={() => {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth() + 1;
                navigate(`/revenue-reports?year=${year}&month=${month}`);
              }}
              style={{
                fontSize: 11,
                color: "#60a5fa",
                fontWeight: 500,
                marginTop: 4,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              View detailed revenue analysis
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
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <Stat label="Total Customers" value={metrics?.totalUsers || 0} />
        <Stat label="Active Members" value={metrics?.activeMembers || 0} />
        {isMainAdmin &&
        metrics?.monthlyRevenue !== null &&
        metrics?.monthlyRevenue !== undefined ? (
          <div
            onClick={() => {
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth() + 1;
              navigate(`/revenue-reports?year=${year}&month=${month}`);
            }}
            style={{
              background: bgSecondary,
              padding: 20,
              borderRadius: 14,
              border: `1px solid ${borderColor}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            }}
          >
            <div
              style={{ color: textSecondary, fontSize: 14, fontWeight: 600 }}
            >
              Monthly Revenue
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                marginTop: 6,
                color: textPrimary,
              }}
            >
              ₱{metrics.monthlyRevenue?.toLocaleString() || "0"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: accentColor,
                fontWeight: 500,
                marginTop: 6,
                textDecoration: "underline",
              }}
            >
              View detailed revenue analysis
            </div>
          </div>
        ) : isStaff ? (
          <Stat label="Monthly Revenue" value="Restricted" />
        ) : (
          <Stat label="Monthly Revenue" value="Restricted" />
        )}
        {metrics?.topSeller && (
          <div
            style={{
              background: bgSecondary,
              padding: 20,
              borderRadius: 14,
              border: `1px solid ${borderColor}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{ color: textSecondary, fontSize: 14, fontWeight: 600 }}
            >
              Top Seller (1 Month)
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginTop: 6,
                color: textPrimary,
              }}
            >
              {metrics.topSeller.name}
            </div>
            <div
              style={{
                fontSize: 12,
                color: textSecondary,
                marginTop: 4,
                textTransform: "capitalize",
              }}
            >
              {metrics.topSeller.type}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#10b981",
                fontWeight: 600,
                marginTop: 6,
              }}
            >
              ₱{metrics.topSeller.revenue?.toLocaleString() || "0"}
            </div>
          </div>
        )}
        <Stat label="New Signups" value={metrics?.newSignups || 0} />
      </div>
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        {isMainAdmin && (
          <>
            <div
              style={{
                background: bgSecondary,
                borderRadius: 14,
                border: `1px solid ${borderColor}`,
                padding: 20,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <EnhancedTrendChart
                data={metrics?.charts?.line ?? []}
                selectedDate={selectedDate}
                isDark={isDark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
              />
            </div>
            <div
              style={{
                background: bgSecondary,
                borderRadius: 14,
                border: `1px solid ${borderColor}`,
                padding: 20,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <EnhancedDonutChart
                data={metrics?.charts?.pie ?? []}
                isDark={isDark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
              />
            </div>
          </>
        )}
        {!isMainAdmin && (
          <div
            style={{
              gridColumn: "1 / -1",
              background: bgSecondary,
              borderRadius: 14,
              border: `1px solid ${borderColor}`,
              padding: 40,
              textAlign: "center",
              color: textSecondary,
              fontSize: 18,
            }}
          >
            Revenue reports and financial summaries are only available to Main
            Admin.
          </div>
        )}
      </div>

      {/* Reports Link */}
      {isMainAdmin && (
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
          }}
        >
          <button
            onClick={() => {
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth() + 1;
              navigate(`/reports?year=${year}&month=${month}`);
            }}
            style={{
              background: "#fbbf24",
              color: isDark ? "#111827" : "#111827",
              border: 0,
              borderRadius: 12,
              padding: "16px 32px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f59e0b";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fbbf24";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            View Detailed Business Reports →
          </button>
        </div>
      )}

      {/* Bottom Section - Low Stock Alert and Attendance */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* Low Stock Alert */}
        <div
          style={{
            background: bgSecondary,
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
              Low Stock Alert {lowStockProducts.length > 0 && `(${lowStockProducts.length} items)`}
            </h3>
          </div>
          <div
            style={{
              background: bgSecondary,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              padding: 12,
            }}
          >
            {lowStockProducts.length > 0 ? (
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
                      background:
                        index % 2 === 0
                          ? isDark
                            ? "#2d3748"
                            : "#f3f4f6"
                          : "transparent",
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
                          color: textPrimary,
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                      >
                        {product.name}
                      </div>
                      <div
                        style={{
                          color: textSecondary,
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
            ) : (
              <div
                style={{
                  color: textSecondary,
                  fontSize: 14,
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                All products are well-stocked ✓
              </div>
            )}
          </div>
        </div>

        {/* Attendance Alert */}
        <div
          style={{
            background: bgSecondary,
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
              background: bgSecondary,
              border: `1px solid ${borderColor}`,
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
                    background:
                      index % 2 === 0
                        ? isDark
                          ? "#2d3748"
                          : "#e5e7eb"
                        : "transparent",
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
                        color:
                          index % 2 === 0
                            ? isDark
                              ? "#e5e7eb"
                              : "#111827"
                            : textPrimary,
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      {entry.clientName}
                    </div>
                    <div
                      style={{
                        color:
                          index % 2 === 0
                            ? isDark
                              ? "#9ca3af"
                              : "#6b7280"
                            : textSecondary,
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
                    color: textSecondary,
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

// Enhanced Interactive Revenue Trend Chart
function EnhancedTrendChart({
  data,
  selectedDate,
  isDark,
  textPrimary,
  textSecondary,
  borderColor,
}: {
  data: Array<{ x: string; y: number }>;
  selectedDate: Date;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}) {
  const [hoveredX, setHoveredX] = React.useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const width = 700;
  const height = 280;
  const padding = { top: 20, right: 40, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.length ? data.map((d) => d.y) : [0];
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min || 1);

  // Calculate Y-axis ticks (5 ticks)
  const yTicks = 5;
  const yTickValues: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(min + (range * i) / yTicks);
  }

  // Calculate week start dates for the selected month (matching backend logic)
  const getWeekDates = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1); // First day of selected month
    const weekDates: string[] = [];

    for (let i = 1; i <= 5; i++) {
      // Match backend: addWeeks(i - 1) then startOfWeek()
      const weekStart = new Date(firstDay);
      weekStart.setDate(firstDay.getDate() + (i - 1) * 7);

      // Get the Sunday of that week (startOfWeek)
      const dayOfWeek = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - dayOfWeek);

      // Format as DD/MM/YYYY
      const day = String(weekStart.getDate()).padStart(2, "0");
      const monthStr = String(weekStart.getMonth() + 1).padStart(2, "0");
      const yearStr = weekStart.getFullYear();
      weekDates.push(`${day}/${monthStr}/${yearStr}`);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();

  // Calculate points for the line
  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight * (1 - (d.y - min) / range);
    return { x, y, value: d.y, date: weekDates[i] || d.x };
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Handle mouse move - show vertical line anywhere on chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Only show if within chart area
    if (x >= padding.left && x <= width - padding.right) {
      setHoveredX(x);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoveredX(null);
      setTooltipPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredX(null);
    setTooltipPos(null);
  };

  // Chart colors
  const lineColor = isDark ? "#60a5fa" : "#3b82f6";
  const gridColor = isDark ? "#2a2a2a" : "#e5e7eb";
  const areaGradientStart = isDark
    ? "rgba(96, 165, 250, 0.4)"
    : "rgba(59, 130, 246, 0.3)";
  const areaGradientEnd = isDark
    ? "rgba(96, 165, 250, 0)"
    : "rgba(59, 130, 246, 0)";

  // Find closest point for tooltip data
  const getClosestPoint = (x: number) => {
    let closestIndex = 0;
    let minDistance = Infinity;
    points.forEach((point, i) => {
      const distance = Math.abs(x - point.x);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    });
    return points[closestIndex];
  };

  const closestPoint = hoveredX !== null ? getClosestPoint(hoveredX) : null;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: textPrimary,
            marginBottom: 4,
          }}
        >
          Revenue Trend
        </div>
        <div
          style={{
            fontSize: 13,
            color: textSecondary,
            fontWeight: 400,
          }}
        >
          Tracking gym income over time
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ borderRadius: 8 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={areaGradientStart} />
            <stop offset="100%" stopColor={areaGradientEnd} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTickValues.map((tick, i) => {
          const y = padding.top + chartHeight * (1 - (tick - min) / range);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={gridColor}
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity={0.5}
              />
            </g>
          );
        })}

        {/* Y-axis labels */}
        {yTickValues.map((tick, i) => {
          const y = padding.top + chartHeight * (1 - (tick - min) / range);
          return (
            <text
              key={`y-label-${i}`}
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill={textSecondary}
              fontWeight="500"
            >
              {formatCurrency(tick)}
            </text>
          );
        })}

        {/* X-axis labels - using dates */}
        {points.map((point, i) => {
          return (
            <text
              key={`x-label-${i}`}
              x={point.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="11"
              fill={textSecondary}
              fontWeight="500"
            >
              {point.date}
            </text>
          );
        })}

        {/* Area fill */}
        {points.length > 0 && (
          <polygon
            points={`${points.map((p) => `${p.x},${p.y}`).join(" ")} ${
              width - padding.right
            },${height - padding.bottom} ${padding.left},${
              height - padding.bottom
            }`}
            fill="url(#trendGradient)"
          />
        )}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            style={{ transition: "all 0.3s ease" }}
          />
        )}

        {/* Vertical line following cursor */}
        {hoveredX !== null && (
          <line
            x1={hoveredX}
            y1={padding.top}
            x2={hoveredX}
            y2={height - padding.bottom}
            stroke={lineColor}
            strokeWidth="2"
            strokeDasharray="4,4"
            opacity="0.7"
            style={{ pointerEvents: "none" }}
          />
        )}

        {/* Tooltip */}
        {hoveredX !== null && tooltipPos && closestPoint && (
          <g>
            <rect
              x={tooltipPos.x - 80}
              y={tooltipPos.y - 60}
              width={160}
              height={50}
              rx={8}
              fill={isDark ? "#1a1a1a" : "#ffffff"}
              stroke={borderColor}
              strokeWidth="1"
              opacity="0.95"
              style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
            />
            <text
              x={tooltipPos.x}
              y={tooltipPos.y - 35}
              textAnchor="middle"
              fontSize="12"
              fill={textSecondary}
              fontWeight="500"
            >
              {closestPoint.date}
            </text>
            <text
              x={tooltipPos.x}
              y={tooltipPos.y - 15}
              textAnchor="middle"
              fontSize="14"
              fill={textPrimary}
              fontWeight="700"
            >
              {formatCurrency(closestPoint.value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// Enhanced Interactive Donut Chart with Legend
function EnhancedDonutChart({
  data,
  isDark,
  textPrimary,
  textSecondary,
  borderColor,
}: {
  data: Array<{ label: string; value: number }>;
  isDark: boolean;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const values = data.length ? data.map((d) => d.value) : [0];
  const total = values.reduce((a, b) => a + b, 0) || 1;

  // Chart colors - theme-aware
  const colors = isDark
    ? ["#34d399", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa"] // Green, Blue, Pink, Yellow, Purple
    : ["#10b981", "#3b82f6", "#ec4899", "#f59e0b", "#8b5cf6"]; // Brighter colors for light mode

  const radius = 70;
  const cx = 120;
  const cy = 120;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  // Format currency
  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Handle mouse move on chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate angle from center
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= radius - 20 && distance <= radius + 20) {
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const normalizedAngle = angle < 0 ? angle + 360 : angle;

      // Find which segment
      let currentAngle = 0;
      for (let i = 0; i < data.length; i++) {
        const segmentAngle = (data[i].value / total) * 360;
        if (
          normalizedAngle >= currentAngle &&
          normalizedAngle < currentAngle + segmentAngle
        ) {
          setHoveredIndex(i);
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          return;
        }
        currentAngle += segmentAngle;
      }
    } else {
      setHoveredIndex(null);
      setTooltipPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPos(null);
  };

  const donutBg = isDark ? "#0f1625" : "#f3f4f6";
  const donutStroke = isDark ? "#162033" : "#e5e7eb";

  return (
    <div style={{ position: "relative" }}>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: textPrimary,
            marginBottom: 4,
          }}
        >
          Revenue Breakdown
        </div>
        <div
          style={{
            fontSize: 13,
            color: textSecondary,
            fontWeight: 400,
          }}
        >
          Income by category
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 240 240"
          width="200"
          height="200"
          style={{ borderRadius: 8 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Background circle */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill={donutBg}
            stroke={donutStroke}
            strokeWidth="18"
          />

          {/* Segments */}
          {data.map((d, i) => {
            const len = (d.value / total) * circumference;
            const segment = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                fill="transparent"
                stroke={colors[i % colors.length]}
                strokeWidth="18"
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.3 : 1}
                style={{
                  transition: "opacity 0.2s ease",
                  cursor: "pointer",
                }}
              />
            );
            offset += len;
            return segment;
          })}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 5}
            textAnchor="middle"
            fontSize="16"
            fill={textPrimary}
            fontWeight="700"
          >
            Total
          </text>
          <text
            x={cx}
            y={cy + 15}
            textAnchor="middle"
            fontSize="14"
            fill={textSecondary}
            fontWeight="600"
          >
            {formatCurrency(total)}
          </text>

          {/* Tooltip */}
          {hoveredIndex !== null && tooltipPos && data[hoveredIndex] && (
            <g>
              <rect
                x={tooltipPos.x - 90}
                y={tooltipPos.y - 70}
                width={180}
                height={60}
                rx={8}
                fill={isDark ? "#1a1a1a" : "#ffffff"}
                stroke={borderColor}
                strokeWidth="1"
                opacity="0.95"
                style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
              />
              <text
                x={tooltipPos.x}
                y={tooltipPos.y - 45}
                textAnchor="middle"
                fontSize="12"
                fill={textSecondary}
                fontWeight="500"
              >
                {data[hoveredIndex].label}
              </text>
              <text
                x={tooltipPos.x}
                y={tooltipPos.y - 25}
                textAnchor="middle"
                fontSize="14"
                fill={textPrimary}
                fontWeight="700"
              >
                {formatCurrency(data[hoveredIndex].value)}
              </text>
              <text
                x={tooltipPos.x}
                y={tooltipPos.y - 5}
                textAnchor="middle"
                fontSize="11"
                fill={textSecondary}
                fontWeight="500"
              >
                {((data[hoveredIndex].value / total) * 100).toFixed(1)}%
              </text>
            </g>
          )}
        </svg>

        {/* Legend */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingLeft: 10,
          }}
        >
          {data.map((item, i) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            const isHovered = hoveredIndex === i;
            return (
              <div
                key={i}
                onMouseEnter={() => {
                  setHoveredIndex(i);
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setTooltipPos(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: isHovered
                    ? isDark
                      ? "rgba(96, 165, 250, 0.1)"
                      : "rgba(59, 130, 246, 0.1)"
                    : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: isHovered
                    ? `1px solid ${borderColor}`
                    : "1px solid transparent",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: colors[i % colors.length],
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: textPrimary,
                      marginBottom: 2,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: textSecondary,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span>{formatCurrency(item.value)}</span>
                    <span>•</span>
                    <span>{percentage}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
