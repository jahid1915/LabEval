import React from 'react';

export default function WorkloadBadge({ level = 'Normal', coursesCount = 0 }) {
  let config = {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    label: 'Normal Workload'
  };

  if (level === 'High') {
    config = {
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      label: 'High Workload'
    };
  } else if (level === 'Overloaded') {
    config = {
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      label: 'Overloaded'
    };
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      <span>{config.label}</span>
      {coursesCount > 0 && <span className="opacity-70">({coursesCount} courses)</span>}
    </span>
  );
}
