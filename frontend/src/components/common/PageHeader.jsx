import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Standard Dashboard Page Header
 * Sets consistent title (24-30px), subtitle (14-16px), breadcrumbs and action button placement.
 */
export default function PageHeader({
  title,
  subtitle,
  badge,
  badgeIcon: BadgeIcon,
  breadcrumbs = [], // [{ label: 'Home', href: '/admin' }, { label: 'Students' }]
  actions,
  className = ""
}) {
  return (
    <div className={`space-y-2 mb-6 ${className}`}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-muted dark:text-text-muted mb-2">
          {breadcrumbs.map((b, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={12} className="text-border-strong dark:text-border-strong" />}
                {b.href && !isLast ? (
                  <Link to={b.href} className="hover:text-primary dark:hover:text-primary transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-semibold text-text-primary dark:text-text-primary" : ""}>
                    {b.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {badge && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-soft dark:bg-primary-soft text-primary dark:text-primary border border-blue-200/60 dark:border-blue-900/40 mb-1.5">
              {BadgeIcon && <BadgeIcon size={12} />}
              <span>{badge}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary dark:text-text-primary font-heading">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-text-muted dark:text-text-muted mt-1 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
