import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

type Period = "daily" | "weekly" | "monthly" | "annual";

export default function RevenueReports() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const isDark = theme === "dark";
  const isMainAdmin = user?.role === "main_admin";

  // Get month/year from URL params (from dashboard navigation)
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const selectedYear = yearParam
    ? parseInt(yearParam)
    : new Date().getFullYear();
  const selectedMonth = monthParam
    ? parseInt(monthParam)
    : new Date().getMonth() + 1;

  const [period, setPeriod] = React.useState<Period>("daily");
  const [reports, setReports] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const bgSecondary = isDark ? "#1a1a1a" : "#f3f4f6"; // Light gray for cards
  const borderColor = isDark ? "#2a2a2a" : "#d1d5db"; // Darker border for visibility
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#9ca3af" : "#6b7280";
  const accentColor = isDark ? "#ffffff" : "#3b82f6";

  const fetchReports = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query string with period and date filters
      const params = new URLSearchParams({
        period: period,
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
      });

      const response = await fetch(
        `/api/revenue-reports?${params.toString()}`,
        {
          headers: {
            "X-User-Email": user?.email || "",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "Access denied. Only Main Admin can view revenue reports."
          );
        }
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
      }

      const data = await response.json();
      setReports(data.reports || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      console.error("Failed to fetch revenue reports:", err);
      setError(err.message || "Failed to load revenue reports");
      setReports([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    if (isMainAdmin) {
      fetchReports();
    }
  }, [period, isMainAdmin, selectedYear, selectedMonth, fetchReports]);

  // Check if user is Main Admin
  if (!isMainAdmin) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: textPrimary,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 16,
            color: textPrimary,
          }}
        >
          Access Denied
        </div>
        <div style={{ fontSize: 18, color: textSecondary }}>
          Revenue reports are only available to Main Admin.
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              margin: 0,
              color: textPrimary,
            }}
          >
            Revenue Reports
          </h1>
          <div
            style={{
              fontSize: 16,
              color: textSecondary,
              marginTop: 4,
            }}
          >
            {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString(
              "en-US",
              {
                month: "long",
                year: "numeric",
              }
            )}
          </div>
        </div>
      </div>

      {/* Period Toggle Buttons */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {(["daily", "weekly", "monthly", "annual"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              background: period === p ? accentColor : "transparent",
              color:
                period === p ? (isDark ? "#000000" : "#ffffff") : textPrimary,
              border: `2px solid ${period === p ? accentColor : borderColor}`,
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.2s ease",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: textSecondary,
            fontSize: 18,
          }}
        >
          Loading revenue reports...
        </div>
      ) : error ? (
        <div
          style={{
            background: bgSecondary,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
            color: "#ef4444",
            fontSize: 16,
          }}
        >
          {error}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  background: bgSecondary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Total Revenue
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: accentColor,
                  }}
                >
                  {formatCurrency(summary.total_revenue || 0)}
                </div>
              </div>
              <div
                style={{
                  background: bgSecondary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Total Transactions
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  {summary.total_transactions || 0}
                </div>
              </div>
              <div
                style={{
                  background: bgSecondary,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    color: textSecondary,
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Average per{" "}
                  {period === "daily"
                    ? "Day"
                    : period === "weekly"
                    ? "Week"
                    : period === "monthly"
                    ? "Month"
                    : "Year"}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  {formatCurrency(summary.average_per_period || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Reports Table */}
          <div
            style={{
              background: bgSecondary,
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 20,
                borderBottom: `1px solid ${borderColor}`,
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  margin: 0,
                  color: textPrimary,
                  textTransform: "capitalize",
                }}
              >
                {period} Revenue Report
              </h2>
            </div>

            {reports.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: textSecondary,
                  fontSize: 16,
                }}
              >
                No revenue data available for the selected period.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: isDark ? "#000000" : "#f3f4f6",
                        borderBottom: `2px solid ${borderColor}`,
                      }}
                    >
                      <th
                        style={{
                          padding: "16px 20px",
                          textAlign: "left",
                          color: textSecondary,
                          fontSize: 14,
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {period === "daily"
                          ? "Date"
                          : period === "weekly"
                          ? "Week"
                          : period === "monthly"
                          ? "Month"
                          : "Year"}
                      </th>
                      <th
                        style={{
                          padding: "16px 20px",
                          textAlign: "right",
                          color: textSecondary,
                          fontSize: 14,
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        Revenue
                      </th>
                      <th
                        style={{
                          padding: "16px 20px",
                          textAlign: "right",
                          color: textSecondary,
                          fontSize: 14,
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        Transactions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report: any, index: number) => {
                      // For weekly reports, add spacing between months
                      const showSpacing =
                        period === "weekly" && report.needsSpacing;

                      return (
                        <React.Fragment key={index}>
                          {showSpacing && (
                            <tr>
                              <td
                                colSpan={3}
                                style={{
                                  padding: "8px 20px",
                                  background: isDark ? "#000000" : "#f3f4f6",
                                  height: "12px",
                                }}
                              ></td>
                            </tr>
                          )}
                          <tr
                            style={{
                              borderBottom: `1px solid ${borderColor}`,
                            }}
                          >
                            <td
                              style={{
                                padding: "16px 20px",
                                color: textPrimary,
                                fontSize: 16,
                                fontWeight: 500,
                              }}
                            >
                              {report.label || report.period}
                            </td>
                            <td
                              style={{
                                padding: "16px 20px",
                                textAlign: "right",
                                color: accentColor,
                                fontSize: 16,
                                fontWeight: 600,
                              }}
                            >
                              {formatCurrency(report.revenue || 0)}
                            </td>
                            <td
                              style={{
                                padding: "16px 20px",
                                textAlign: "right",
                                color: textPrimary,
                                fontSize: 16,
                              }}
                            >
                              {report.count || 0}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
