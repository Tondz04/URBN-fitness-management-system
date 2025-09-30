export function Status({ value }: { value: string }) {
  const color =
    value === "paid" ? "#10b981" : value === "pending" ? "#f59e0b" : "#ef4444";
  return (
    <span
      style={{
        background: color + "22",
        color,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
      }}
    >
      {value}
    </span>
  );
}
