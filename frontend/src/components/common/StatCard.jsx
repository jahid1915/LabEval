import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Reusable StatCard Component
 * Consistent across Admin, Head, Teacher, and Student dashboards.
 * Follows the restrained academic color system.
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend, // { value: "+8.2%", isPositive: true, label: "vs last semester" }
  accent = "blue", // "blue" | "emerald" | "amber" | "rose" | "indigo" | "slate"
  onClick,
  className = ""
}) {
  const accentClasses = {
    blue: {
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-100 dark:border-blue-900/40",
      indicator: "bg-blue-600",
    },
    emerald: {
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40",
      indicator: "bg-emerald-600",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-100 dark:border-amber-900/40",
      indicator: "bg-amber-600",
    },
    rose: {
      iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-100 dark:border-rose-900/40",
      indicator: "bg-rose-600",
    },
    indigo: {
      iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40",
      indicator: "bg-indigo-600",
    },
    slate: {
      iconBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      indicator: "bg-slate-500",
    }
  };

  const currentAccent = accentClasses[accent] || accentClasses.blue;

  return (
    <div
      onClick={onClick}
      className={`relative bg-surface dark:bg-surface border border-border dark:border-border rounded-xl p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-border-strong dark:hover:border-border-strong hover:shadow-xs' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted dark:text-text-muted">
          {title}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${currentAccent.iconBg}`}>
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary dark:text-text-primary font-mono">
          {value ?? 0}
        </div>

        {subtitle && (
          <p className="text-xs text-text-muted dark:text-text-muted mt-1 truncate">
            {subtitle}
          </p>
        )}

        {trend && (
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium">
            <span className={`inline-flex items-center gap-0.5 font-semibold ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {trend.isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-text-muted dark:text-text-muted text-[11px]">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
