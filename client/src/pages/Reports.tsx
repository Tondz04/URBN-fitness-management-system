import * as React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function Reports() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = theme === "dark";
  const isMainAdmin = user?.role === "main_admin";

  const bgPrimary = isDark ? "#0a0a0a" : "#ffffff";
  const bgSecondary = isDark ? "#1a1a1a" : "#f9fafb";
  const bgTertiary = isDark ? "#2a2a2a" : "#ffffff";
  const borderColor = isDark ? "#2a2a2a" : "#e5e7eb";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const accentGreen = "#10b981";
  const accentRed = "#ef4444";
  const accentYellow = "#f59e0b";

  const [selectedDate, setSelectedDate] = React.useState(() => {
    const year = parseInt(
      searchParams.get("year") || new Date().getFullYear().toString()
    );
    const month = parseInt(
      searchParams.get("month") || (new Date().getMonth() + 1).toString()
    );
    return new Date(year, month - 1, 1);
  });

  const [reportData, setReportData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isMainAdmin) {
      navigate("/");
      return;
    }
    fetchReportData();
  }, [selectedDate, isMainAdmin]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const userEmail = user?.email || "";

      const response = await fetch(
        `/api/business-reports?year=${year}&month=${month}`,
        {
          headers: {
            "X-User-Email": userEmail,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch report data");
      }

      const data = await response.json();

      // Always set reportData, even if it's empty (the endpoint should always return data)
      if (data.error) {
        console.error("API Error:", data.message);
        setReportData(null);
      } else {
        setReportData(data);
      }
    } catch (err: any) {
      console.error("Failed to fetch report data:", err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  };

  if (!isMainAdmin) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: textSecondary }}>
          Access restricted to Main Admin only
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: textSecondary }}>
          Generating comprehensive report...
        </div>
      </div>
    );
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Show data even if all values are zero - the report should still display
  // Only show error if reportData is explicitly null (error occurred)
  if (reportData === null) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 18, color: accentRed, marginBottom: 8 }}>
          Error loading report data
        </div>
        <div style={{ fontSize: 14, color: textSecondary }}>
          Please try refreshing the page or selecting a different month
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 40px 0" }}>
      {/* Header Section - Accounting Style */}
      <div
        style={{
          background: bgTertiary,
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          padding: "32px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: textPrimary,
                margin: 0,
                marginBottom: 4,
              }}
            >
              MONTHLY BUSINESS REPORT
            </h1>
            <div
              style={{
                fontSize: 18,
                color: textSecondary,
                fontWeight: 600,
              }}
            >
              {reportData.period?.monthName ||
                `${
                  monthNames[selectedDate.getMonth()]
                } ${selectedDate.getFullYear()}`}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: bgSecondary,
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
            }}
          >
            <button
              onClick={() => navigateMonth("prev")}
              style={{
                background: "transparent",
                border: `1px solid ${borderColor}`,
                color: textPrimary,
                borderRadius: 6,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ← Prev
            </button>
            <div
              style={{
                color: textPrimary,
                fontSize: 16,
                fontWeight: 700,
                minWidth: 180,
                textAlign: "center",
              }}
            >
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              {isCurrentMonth() && (
                <div
                  style={{
                    fontSize: 11,
                    color: accentGreen,
                    fontWeight: 600,
                    marginTop: 2,
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
                border: `1px solid ${borderColor}`,
                color: isCurrentMonth() ? "#6b7280" : textPrimary,
                borderRadius: 6,
                padding: "8px 12px",
                cursor: isCurrentMonth() ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Next →
            </button>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: `2px solid ${borderColor}`,
            display: "flex",
            gap: 32,
            fontSize: 14,
            color: textSecondary,
          }}
        >
          <div>
            <strong>Report Generated:</strong> {new Date().toLocaleDateString()}
          </div>
          <div>
            <strong>Report Type:</strong> Comprehensive Monthly Analysis
          </div>
        </div>
      </div>

      {/* Executive Summary - Accounting Style Table */}
      <div
        style={{
          background: bgTertiary,
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: textPrimary,
            marginBottom: 20,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Executive Summary
        </h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 15,
          }}
        >
          <thead>
            <tr
              style={{
                background: bgSecondary,
                borderBottom: `2px solid ${borderColor}`,
              }}
            >
              <th
                style={{
                  padding: "14px 16px",
                  textAlign: "left",
                  color: textPrimary,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Metric
              </th>
              <th
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textPrimary,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Value
              </th>
              <th
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textPrimary,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Percentage
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              <td style={{ padding: "14px 16px", color: textPrimary }}>
                &nbsp;&nbsp;Membership Revenue
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                ₱
                {reportData.revenue?.membership?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textSecondary,
                }}
              >
                {reportData.revenue?.total
                  ? `${(
                      (reportData.revenue.membership /
                        reportData.revenue.total) *
                      100
                    ).toFixed(1)}%`
                  : "0.0%"}
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              <td style={{ padding: "14px 16px", color: textPrimary }}>
                &nbsp;&nbsp;Product Revenue
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                ₱
                {reportData.revenue?.product?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textSecondary,
                }}
              >
                {reportData.revenue?.total
                  ? `${(
                      (reportData.revenue.product / reportData.revenue.total) *
                      100
                    ).toFixed(1)}%`
                  : "0.0%"}
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
              <td
                style={{
                  padding: "14px 16px",
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Total Revenue
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: accentGreen,
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                ₱
                {reportData.revenue?.total?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textSecondary,
                }}
              >
                100.0%
              </td>
            </tr>
            {reportData.revenue?.walkIn > 0 && (
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "14px 16px", color: textPrimary }}>
                  &nbsp;&nbsp;Walk-in Revenue
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    color: textPrimary,
                    fontWeight: 600,
                  }}
                >
                  ₱
                  {reportData.revenue.walkIn.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    color: textSecondary,
                  }}
                >
                  {reportData.revenue?.total
                    ? `${(
                        (reportData.revenue.walkIn / reportData.revenue.total) *
                        100
                      ).toFixed(1)}%`
                    : "0.0%"}
                </td>
              </tr>
            )}
            <tr style={{ borderBottom: `2px solid ${borderColor}` }}>
              <td
                style={{
                  padding: "14px 16px",
                  color: textPrimary,
                  fontWeight: 600,
                }}
              >
                Average Transaction Value
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textPrimary,
                  fontWeight: 700,
                }}
              >
                ₱
                {reportData.revenue?.averageTransaction?.toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                ) || "0.00"}
              </td>
              <td
                style={{
                  padding: "14px 16px",
                  textAlign: "right",
                  color: textSecondary,
                }}
              >
                —
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transaction Analysis */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: bgTertiary,
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: textPrimary,
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            Transaction Analysis
          </h2>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <tbody>
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "12px 0", color: textPrimary }}>
                  Total Transactions
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  {reportData.transactions?.total || 0}
                </td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "12px 0", color: textPrimary }}>Paid</td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: accentGreen,
                    fontWeight: 600,
                  }}
                >
                  {reportData.transactions?.paid || 0}
                </td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "12px 0", color: textPrimary }}>
                  Pending
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: accentYellow,
                    fontWeight: 600,
                  }}
                >
                  {reportData.transactions?.pending || 0}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px 0", color: textPrimary }}>
                  Cancelled
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: accentRed,
                    fontWeight: 600,
                  }}
                >
                  {reportData.transactions?.cancelled || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            background: bgTertiary,
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: textPrimary,
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            Customer Metrics
          </h2>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <tbody>
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "12px 0", color: textPrimary }}>
                  Total Customers
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  {reportData.customers?.total || 0}
                </td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "12px 0", color: textPrimary }}>
                  Active Members
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: accentGreen,
                    fontWeight: 600,
                  }}
                >
                  {reportData.customers?.active || 0}
                </td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                <td style={{ padding: "12px 0", color: textPrimary }}>
                  New Customers
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: accentGreen,
                    fontWeight: 600,
                  }}
                >
                  {reportData.customers?.new || 0}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "12px 0", color: textPrimary }}>
                  Expired Members
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    textAlign: "right",
                    color: accentRed,
                    fontWeight: 600,
                  }}
                >
                  {reportData.customers?.expired || 0}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products Table */}
      {reportData.topProducts && reportData.topProducts.length > 0 && (
        <div
          style={{
            background: bgTertiary,
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: textPrimary,
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            Top Selling Products
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  background: bgSecondary,
                  borderBottom: `2px solid ${borderColor}`,
                }}
              >
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Rank
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Product Name
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Quantity Sold
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Transactions
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    color: textPrimary,
                    fontWeight: 700,
                  }}
                >
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.topProducts.map((product: any, index: number) => (
                <tr
                  key={product.id || index}
                  style={{
                    borderBottom: `1px solid ${borderColor}`,
                    background: index % 2 === 0 ? "transparent" : bgSecondary,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      color: textPrimary,
                      fontWeight: 600,
                    }}
                  >
                    #{index + 1}
                  </td>
                  <td style={{ padding: "12px 16px", color: textPrimary }}>
                    {product.name}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: textPrimary,
                    }}
                  >
                    {product.quantity || 0}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: textSecondary,
                    }}
                  >
                    {product.transactions || 0}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: accentGreen,
                      fontWeight: 600,
                    }}
                  >
                    ₱
                    {product.revenue?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Memberships & Weekly Breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {reportData.topMemberships && reportData.topMemberships.length > 0 && (
          <div
            style={{
              background: bgTertiary,
              border: `2px solid ${borderColor}`,
              borderRadius: 8,
              padding: 24,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: textPrimary,
                marginBottom: 16,
                textTransform: "uppercase",
              }}
            >
              Membership Types Performance
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: bgSecondary,
                    borderBottom: `2px solid ${borderColor}`,
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      color: textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    Count
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.topMemberships.map(
                  (membership: any, index: number) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: `1px solid ${borderColor}`,
                        background:
                          index % 2 === 0 ? "transparent" : bgSecondary,
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: textPrimary }}>
                        {membership.type?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          color: textPrimary,
                        }}
                      >
                        {membership.count || 0}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          color: accentGreen,
                          fontWeight: 600,
                        }}
                      >
                        ₱
                        {membership.revenue?.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || "0.00"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportData.weeklyBreakdown &&
          reportData.weeklyBreakdown.length > 0 && (
            <div
              style={{
                background: bgTertiary,
                border: `2px solid ${borderColor}`,
                borderRadius: 8,
                padding: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: textPrimary,
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                Weekly Performance
              </h2>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: bgSecondary,
                      borderBottom: `2px solid ${borderColor}`,
                    }}
                  >
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        color: textPrimary,
                        fontWeight: 700,
                      }}
                    >
                      Week
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        color: textPrimary,
                        fontWeight: 700,
                      }}
                    >
                      Transactions
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        color: textPrimary,
                        fontWeight: 700,
                      }}
                    >
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.weeklyBreakdown.map(
                    (week: any, index: number) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: `1px solid ${borderColor}`,
                          background:
                            index % 2 === 0 ? "transparent" : bgSecondary,
                        }}
                      >
                        <td
                          style={{ padding: "12px 16px", color: textPrimary }}
                        >
                          Week {week.week} ({week.start} - {week.end})
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            color: textPrimary,
                          }}
                        >
                          {week.transactions || 0}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            color: accentGreen,
                            fontWeight: 600,
                          }}
                        >
                          ₱
                          {week.revenue?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || "0.00"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Daily Breakdown */}
      {reportData.dailyBreakdown && reportData.dailyBreakdown.length > 0 && (
        <div
          style={{
            background: bgTertiary,
            border: `2px solid ${borderColor}`,
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: textPrimary,
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            Daily Transaction Breakdown
          </h2>
          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead
                style={{ position: "sticky", top: 0, background: bgSecondary }}
              >
                <tr style={{ borderBottom: `2px solid ${borderColor}` }}>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      color: textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      color: textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    Transactions
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      color: textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.dailyBreakdown.map((day: any, index: number) => (
                  <tr
                    key={day.date}
                    style={{
                      borderBottom: `1px solid ${borderColor}`,
                      background: index % 2 === 0 ? "transparent" : bgSecondary,
                    }}
                  >
                    <td style={{ padding: "10px 12px", color: textPrimary }}>
                      {day.label}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: textPrimary,
                      }}
                    >
                      {day.transactions || 0}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        color: accentGreen,
                        fontWeight: 600,
                      }}
                    >
                      ₱
                      {day.revenue?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: `2px solid ${borderColor}`,
          textAlign: "center",
          color: textSecondary,
          fontSize: 12,
        }}
      >
        This report was generated automatically by URBN Fitness Gym Management
        System
        <br />
        Report Period: {reportData.period?.monthName || "N/A"} | Generated:{" "}
        {new Date().toLocaleString()}
      </div>
    </div>
  );
}
