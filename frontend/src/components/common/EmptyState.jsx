/**
 * EmptyState Component
 * Restrained academic empty state with Lucide icon and clear call to action.
 */
export default function EmptyState({
  icon: Icon,
  title = "No data found",
  description = "There are no records to display at this time.",
  action,
  className = ""
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-surface dark:bg-surface border border-dashed border-border dark:border-border rounded-2xl ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-secondary dark:bg-surface-secondary border border-border dark:border-border flex items-center justify-center text-text-muted dark:text-text-muted mb-3">
          <Icon size={22} />
        </div>
      )}
      <h3 className="text-sm sm:text-base font-bold text-text-primary dark:text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-xs text-text-muted dark:text-text-muted max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
