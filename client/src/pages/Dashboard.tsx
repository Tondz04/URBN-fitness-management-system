import * as React from "react";
import { Layout } from "../components/Layout";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "#0f1625",
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

  React.useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout

    setLoading(true);
    setError(null);

    fetch("/api/metrics", { signal: controller.signal })
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

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 18, color: "#9ca3af" }}>
            Loading dashboard...
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !metrics) {
    return (
      <Layout>
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
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 16 }}>
          Admin Dashboard
        </h2>
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
              background: "#0f1625",
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
              background: "#0f1625",
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
      </div>
    </Layout>
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
