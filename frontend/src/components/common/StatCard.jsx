import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

/**
 * Reusable Ultra-Aesthetic StatCard Component
 * Displays key metrics with glowing accent gradients, stylish typography, and micro-interactions.
 */
export default function StatCard({
  title,
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant,
  accent = "blue",
  onClick,
  loading = false,
  className = ""
}) {
  const displayTitle = title || label || '';

  // Vibrant accent definitions with rich gradients, stylish badges, and soft glow
  const accentThemes = {
    blue: {
      gradient: "from-blue-500/15 via-indigo-500/5 to-transparent",
      border: "border-blue-200/80 dark:border-blue-900/40 hover:border-blue-400 dark:hover:border-blue-700",
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25",
      badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40",
      valColor: "text-slate-900 dark:text-white",
    },
    emerald: {
      gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
      border: "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-700",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
      valColor: "text-slate-900 dark:text-white",
    },
    purple: {
      gradient: "from-purple-500/15 via-fuchsia-500/5 to-transparent",
      border: "border-purple-200/80 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-700",
      iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25",
      badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40",
      valColor: "text-slate-900 dark:text-white",
    },
    indigo: {
      gradient: "from-indigo-500/15 via-blue-500/5 to-transparent",
      border: "border-indigo-200/80 dark:border-indigo-900/40 hover:border-indigo-400 dark:hover:border-indigo-700",
      iconBg: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25",
      badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40",
      valColor: "text-slate-900 dark:text-white",
    },
    amber: {
      gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
      border: "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-700",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25",
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
      valColor: "text-slate-900 dark:text-white",
    },
    rose: {
      gradient: "from-rose-500/15 via-pink-500/5 to-transparent",
      border: "border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400 dark:hover:border-rose-700",
      iconBg: "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25",
      badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40",
      valColor: "text-slate-900 dark:text-white",
    },
    cyan: {
      gradient: "from-cyan-500/15 via-sky-500/5 to-transparent",
      border: "border-cyan-200/80 dark:border-cyan-900/40 hover:border-cyan-400 dark:hover:border-cyan-700",
      iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25",
      badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/40",
      valColor: "text-slate-900 dark:text-white",
    }
  };

  const themeKey = accentThemes[accent] ? accent : (accentThemes[variant] ? variant : 'blue');
  const theme = accentThemes[themeKey] || accentThemes.blue;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md border ${theme.border} rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-xs ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Decorative ambient background blur */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${theme.gradient} blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />

      <div className="relative flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {displayTitle}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg} group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={17} strokeWidth={2.2} />
          </div>
        )}
      </div>

      <div className="relative mt-3">
        {loading ? (
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg my-1" />
        ) : (
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${theme.valColor} font-mono`}>
            {value ?? 0}
          </div>
        )}

        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {subtitle}
          </p>
        )}

        {/* Dynamic Trend / Category Pill */}
        {trend && (
          <div className="mt-2.5 flex items-center gap-1.5">
            {typeof trend === 'string' ? (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border ${theme.badge}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />
                {trend}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  trend.isPositive !== false
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40'
                }`}>
                  {trend.isPositive !== false ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {trend.value}
                </span>
                {trend.label && (
                  <span className="text-slate-400 text-[11px] truncate">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
