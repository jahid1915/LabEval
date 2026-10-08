/**
 * StatusBadge Component
 * Semantic, restrained status indicator. Never uses saturated neon backgrounds.
 */
export default function StatusBadge({
  status = "ACTIVE",
  label,
  size = "md", // "sm" | "md"
  dot = true,
  className = ""
}) {
  const norm = String(status).toUpperCase();

  const statusConfig = {
    ACTIVE: {
      bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/40",
      dotBg: "bg-emerald-500",
      defaultLabel: "Active"
    },
    ENROLLED: {
      bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/40",
      dotBg: "bg-emerald-500",
      defaultLabel: "Enrolled"
    },
    COMPLETED: {
      bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/40",
      dotBg: "bg-blue-500",
      defaultLabel: "Completed"
    },
    PENDING: {
      bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/40",
      dotBg: "bg-amber-500",
      defaultLabel: "Pending"
    },
    PENDING_TEACHER: {
      bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/40",
      dotBg: "bg-amber-500",
      defaultLabel: "Pending Teacher"
    },
    INACTIVE: {
      bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      dotBg: "bg-slate-400",
      defaultLabel: "Inactive"
    },
    CANCELLED: {
      bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/40",
      dotBg: "bg-rose-500",
      defaultLabel: "Cancelled"
    },
    DROPPED: {
      bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/40",
      dotBg: "bg-rose-500",
      defaultLabel: "Dropped"
    },
    DRAFT: {
      bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      dotBg: "bg-slate-400",
      defaultLabel: "Draft"
    },
    UNOFFERED: {
      bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      dotBg: "bg-slate-400",
      defaultLabel: "Unoffered"
    }
  };

  const config = statusConfig[norm] || statusConfig.INACTIVE;
  const displayLabel = label || config.defaultLabel;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md border ${sizeClasses} ${config.bg} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotBg}`} />}
      <span>{displayLabel}</span>
    </span>
  );
}
