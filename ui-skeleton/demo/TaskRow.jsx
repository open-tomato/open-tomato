/* global React, Icon, Badge, Avatar */

function TaskRow({ task, onSeed }) {
  const { title, status, priority, owner, eta, tag } = task;
  const priorityColor = {
    high: "var(--danger)",
    medium: "var(--gold-500)",
    low: "var(--fg3)",
  }[priority];
  const statusVariant = { todo: "neutral", "in-progress": "warning", done: "success" }[status] || "neutral";
  const statusLabel = { todo: "todo", "in-progress": "in progress", done: "done" }[status];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "16px 1fr 110px 110px 80px 100px",
      alignItems: "center",
      gap: 14,
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-soft)",
      background: "var(--surface-1)",
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: "50%",
        background: priorityColor,
        boxShadow: `0 0 0 3px color-mix(in oklab, ${priorityColor} 20%, transparent)`,
      }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--fg1)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {tag && <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg3)" }}>{tag}</div>}
      </div>
      <Badge variant={statusVariant}>{statusLabel}</Badge>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg2)" }}>
        <Avatar name={owner} size={20} color={owner === "agent" ? "var(--primary)" : "var(--accent)"} />
        {owner}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg3)" }}>{eta}</div>
      <button onClick={onSeed} style={{
        background: "transparent",
        color: "var(--accent)",
        border: "1px solid var(--border-soft)",
        borderRadius: "var(--radius-md)",
        padding: "5px 10px",
        fontFamily: "var(--font-body)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}>
        <Icon name="zap" size={12} />
        seed
      </button>
    </div>
  );
}

// Object.assign(window, { TaskRow });
export { TaskRow };