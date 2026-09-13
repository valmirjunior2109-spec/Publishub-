import { STATUS_LABELS, isActive } from "@/lib/format";

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {isActive(status) && <span className="spinner spinner-small" aria-hidden />}
      {STATUS_LABELS[status] || status}
    </span>
  );
}
